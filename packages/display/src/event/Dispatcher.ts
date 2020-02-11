/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 * License-Filename: LICENSE
 */

import {addEventListener, removeEventListener} from '../DOMTools';
import {MapEvent} from './Event';
import {Listener, TaskManager} from '@here/xyz-maps-common';

type EventHandler = (e: Event) => void;

const DOUBLE_CLICK_DETECT_MS = 250;
const POINTER_UP = 'pointerup';
const POINTER_ENTER = 'pointerenter';
const POINTER_LEAVE = 'pointerleave';
const POINTER_DOWN = 'pointerdown';
const POINTER_MOVE = 'pointermove';
const PRESSMOVE = 'pressmove';
const TAP = 'tap';
const DBLTAP = 'dbltap';
const SUPPORTED = [POINTER_UP, POINTER_ENTER, POINTER_LEAVE, POINTER_DOWN, POINTER_MOVE, PRESSMOVE, TAP, DBLTAP];

function isSupported(type) {
    return SUPPORTED.indexOf(type) !== -1;
}

function getMousePosition(domEl, event) {
    let evType = event.type;

    if (
        evType == 'touchstart' ||
        evType == 'touchmove' ||
        evType == 'touchend'
    ) {
        // event = event.targetTouches[0];
        event = event.changedTouches[event.changedTouches.length - 1];
    }
    // use parent node of canvas as its parent node stays static in panning
    let offset = domEl.getBoundingClientRect();

    return [
        event.pageX - offset.left,
        event.pageY - offset.top
    ];
}


export class EventDispatcher {
    private cbs: Listener;
    private disabled: { [type: string]: boolean } = {};

    private onPointerDown: EventHandler;
    private onPointerMove: EventHandler;
    private onPointerUp: EventHandler;

    private hActive: boolean = false; // GLOBAL_HANDLERS_ACTIVE
    private cnt: number = 0; // cnt
    private el: HTMLElement;

    constructor(domEl, map, searchLayers, config) {
        this.el = domEl;
        this.cbs = new Listener(['click']);

        const {disabled} = this;
        let MOUSEDOWN_POS;
        let MOUSEDOWN_TARGET;
        let isDragged = false;
        let isPointerDown = false;
        let startMapCenter;
        let prevPointerDownTs = 0;
        let prevPointerDownTarget;
        let currentHoverTarget;
        let mouseoverFPS = 1000 / 25;
        let mousemoveEvent;
        let checkingHover = false;
        let callbacks = this.cbs;

        callbacks.sync(true);

        SUPPORTED.forEach((ev) => {
            callbacks.addEvent(ev);
            disabled[ev] = false;
        });

        let checkLineHover = TaskManager.getInstance().create({
            delay: mouseoverFPS,
            priority: 5,

            exec: function() {
                findTarget(mousemoveEvent);
                checkingHover = false;
            }
        });

        function handleDoubleClick(ev) {
            let timestamp = Date.now();
            let downTarget = MOUSEDOWN_TARGET && MOUSEDOWN_TARGET.feature;

            if (
                timestamp - prevPointerDownTs < DOUBLE_CLICK_DETECT_MS &&
                !isDragged &&
                prevPointerDownTarget == downTarget
            ) {
                trigger(DBLTAP, ev, MOUSEDOWN_POS, MOUSEDOWN_TARGET);
            }
            prevPointerDownTarget = downTarget;
            prevPointerDownTs = timestamp;
        }

        function isFeatureDragListened() {
            return MOUSEDOWN_TARGET && callbacks.isListened(PRESSMOVE);
        }

        function createMapEvent(type, nativeEvent, mapX, mapY, detail) {
            let tigerEvent = new MapEvent(type, detail);
            tigerEvent.mapX = mapX;
            tigerEvent.mapY = mapY;
            tigerEvent.nativeEvent = nativeEvent;

            if (detail) {
                tigerEvent.target = detail.feature;
                tigerEvent.detail.display = map;
            }

            tigerEvent.button = nativeEvent.button;

            return tigerEvent;
        }

        function trigger(type, nev, pos, target) {
            callbacks.trigger(
                type,
                [createMapEvent(type, nev, pos[0], pos[1], target)],
                false
            );
        }

        function listenMouseMove(e) {
            mousemoveEvent = e;

            if (!disabled['pointerenter'] && !disabled['pointerleave'] && !checkingHover) {
                checkingHover = true;
                checkLineHover.start();
                // checkLineHover.run( mouseoverFPS );
            }
        }

        function searchForFeature(pos) {
            return map.getFeatureAt({
                x: pos[0],
                y: pos[1]
            }, {
                layers: map.layers.filter(function(l) {
                    return l.pointerEvents();
                })
            });
        }

        function findTarget(ev) {
            let position = getMousePosition(domEl, ev);
            let target = searchForFeature(position);


            trigger(POINTER_MOVE, ev, position, target);

            if (target) {
                if (currentHoverTarget) {
                    if (currentHoverTarget.feature.id !== target.feature.id) {
                        trigger(POINTER_LEAVE, ev, position, currentHoverTarget);
                        trigger(POINTER_ENTER, ev, position, target);
                    }
                } else {
                    trigger(POINTER_ENTER, ev, position, target);
                }
            } else if (currentHoverTarget) {
                trigger(POINTER_LEAVE, ev, position, currentHoverTarget);
            }

            currentHoverTarget = target;
        }

        this.onPointerDown = function(ev) {
            startMapCenter = map.getCenter();
            isPointerDown = true;
            isDragged = false;
            MOUSEDOWN_POS = getMousePosition(domEl, ev);
            MOUSEDOWN_TARGET = searchForFeature(MOUSEDOWN_POS);
            trigger(POINTER_DOWN, ev, MOUSEDOWN_POS, MOUSEDOWN_TARGET);

            //  make sure no mousedown is triggered to prevent double triggering of event!
            if (ev.type == 'touchstart' && (<HTMLElement>ev.target).parentNode == domEl) {
                ev.preventDefault();
            }
        };

        this.onPointerMove = function(ev) {
            let pos;
            let dx;
            let dy;
            if (isPointerDown) {
                let threshold = config['minPanMapThreshold'];
                // FIX FOR ANDROID >7.0 devices triggering touchmove with 0 or 0.012312 (Galaxy S8)
                if (!isDragged) {
                    pos = getMousePosition(domEl, ev);
                    dx = pos[0] - MOUSEDOWN_POS[0];
                    dy = pos[1] - MOUSEDOWN_POS[1];

                    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
                        return;
                    }
                }
            }

            isDragged = true;

            if (!isPointerDown) {
                if (ev.type != 'touchmove' && (
                    callbacks.isListened(POINTER_ENTER) ||
                    callbacks.isListened(POINTER_LEAVE) ||
                    callbacks.isListened(POINTER_MOVE)
                )
                ) {
                    listenMouseMove(ev);
                }
            } else if (isFeatureDragListened()) {
                pos = getMousePosition(domEl, ev);

                dx = pos[0] - MOUSEDOWN_POS[0];

                dy = pos[1] - MOUSEDOWN_POS[1];

                callbacks.trigger(PRESSMOVE, [createMapEvent(PRESSMOVE, ev, pos[0], pos[1], MOUSEDOWN_TARGET), dx, dy], false);
            }
        };

        this.onPointerUp = function(ev) {
            if (isPointerDown) {
                let center = map.getCenter();
                let isMapDragged = startMapCenter.longitude != center.longitude ||
                    startMapCenter.latitude != center.latitude;

                // currently pointerup is not getting triggered after drag to simulate SandwichMap's behaviour!
                // this is implemented to make sure objects are not getting selection after pan gesture.
                // TODO: remove workaround and always trigger the pointerup event. Object selection needs to be prevented elsewhere
                // if( !isDragged )
                if (!isMapDragged) {
                    // only trigger if mapel/canvas directly on top.. no other element in between
                    if (
                        (<HTMLElement>ev.target).parentNode == domEl && (MOUSEDOWN_TARGET || !isDragged)
                    ) {
                        let pointerUpPosition = getMousePosition(domEl, ev);
                        trigger(TAP, ev, pointerUpPosition, MOUSEDOWN_TARGET);
                        trigger(POINTER_UP, ev, pointerUpPosition, MOUSEDOWN_TARGET);
                        handleDoubleClick(ev);
                    }
                }

                isPointerDown = isDragged = false;
            }
        };
    }

    private getGlobalHandlers() {
        const {onPointerDown, onPointerMove, onPointerUp} = this;
        return {
            touchstart: onPointerDown,
            touchmove: onPointerMove,
            touchend: onPointerUp,

            mousedown: onPointerDown,
            mouseup: onPointerUp,
            mousemove: onPointerMove
        };
    }

    enable(event: string) {
        if (isSupported(event)) {
            delete this.disabled[event];
        }
    };

    disable(event: string) {
        if (isSupported(event)) {
            this.disabled[event] = true;
        }
    };

    destroy() {
        let globalEvents = this.getGlobalHandlers();

        if (this.hActive) {
            for (let type in globalEvents) {
                removeEventListener(this.el, type, globalEvents[type]);
            }
            this.hActive = false;
        }
    };

    addEventListener(type: string, cb: EventHandler, scope?) {
        if (isSupported(type) && this.cbs.add(type, cb, scope)) {
            this.cnt++;

            let globalEvents = this.getGlobalHandlers();
            let gl;

            if (!this.hActive) {
                for (let ev in globalEvents) {
                    gl = globalEvents[ev];

                    let {el} = this;

                    if (ev == 'mouseup') {
                        // support shadowdom
                        while (el.parentNode) {
                            el = <HTMLElement>el.parentNode;
                        }
                    }

                    addEventListener(el, ev, gl);

                    this.hActive = true;
                }
            }
        }
    };

    removeEventListener(type: string, cb: EventHandler, scope?: any) {
        const {cbs, el} = this;
        if (isSupported(type) && cbs.remove(type, cb, scope)) {
            if (!--this.cnt && this.hActive) {
                let globalEvents = this.getGlobalHandlers();

                for (let ev in globalEvents) {
                    if (!cbs.isListened(ev)) {
                        removeEventListener(el, ev, globalEvents[ev]);
                    }
                }
                this.hActive = false;
            }
        }
    };
}
