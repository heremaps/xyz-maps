/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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

import {addEventListener, getPointRelativeToElement, removeEventListener} from '../DOMTools';
import {global as WIN} from '@here/xyz-maps-common';
import {ScrollHandler} from './ScrollHandler';
import {Map} from '../Map';
import {Animation} from '../animation/Animation';
import {getDistance} from '../geometry';
import {KineticPanAnimator} from '../animation/KineticPanAnimator';
import {MapOptions, ModifierKey} from '../MapOptions';

const MIN_ROTATION = 5;
const TWO_FINGER_PINCH_THRESHOLD = 110;
const PRIMARY_MOUSE_BUTTON = 0;
const SECONDARY_MOUSE_BUTTON = 2;
let UNDEF;

const DEFAULT_PITCH_AND_ROTATE_MODIFIERS: ModifierKey[] = ['ctrl', 'meta'];

const isModifierPressed = (ev: MouseEvent, modifier: ModifierKey): boolean => {
    switch (modifier) {
    case 'ctrl':
        return ev.ctrlKey;
    case 'meta':
        return ev.metaKey;
    case 'shift':
        return ev.shiftKey;
    case 'alt':
        return ev.altKey;
    default:
        return false;
    }
};

const isPitchAndRotateModifierPressed = (
    ev: MouseEvent,
    modifiers?: ModifierKey | ModifierKey[]
): boolean => {
    const configuredModifiers = modifiers == UNDEF
        ? DEFAULT_PITCH_AND_ROTATE_MODIFIERS
        : Array.isArray(modifiers) ? modifiers : [modifiers];

    return configuredModifiers.some((modifier) => isModifierPressed(ev, modifier));
};

type BehaviorOptions = {
    zoom?: boolean | 'fixed' | 'float';
    drag?: boolean;
    rotate?: boolean;
    pitch?: boolean;
    pitchAndRotateModifiers?: ModifierKey | ModifierKey[];
}

const getCenter = (ev: TouchEvent | MouseEvent, mapEl: HTMLElement): [x: number, y: number] | null => {
    const targetTouches = (<TouchEvent>ev).targetTouches;

    if (!targetTouches) {
        return getPointRelativeToElement(mapEl, <MouseEvent>ev);
    }

    if (!targetTouches.length) {
        return null;
    }

    const p1 = getPointRelativeToElement(mapEl, targetTouches[targetTouches.length - 1]);

    if (targetTouches.length == 1) {
        return p1;
    }

    const p2 = getPointRelativeToElement(mapEl, targetTouches[targetTouches.length - 2]);

    return [
        (p1[0] + p2[0]) / 2,
        (p1[1] + p2[1]) / 2
    ];
};

const getAngle = (ev: TouchEvent): number => {
    // disabled because of "hiccups"
    // iOS
    // const {rotation} = <any>ev;
    // if (rotation != UNDEF) {
    //     return rotation;
    // }

    const targetTouches = ev.targetTouches;
    const length = targetTouches.length;
    const p2 = targetTouches[length - 2];

    if (p2) {
        const p1 = targetTouches[length - 1];
        const dx = p2.clientX - p1.clientX;
        const dy = p2.clientY - p1.clientY;

        return Math.atan2(dy, dx) * 180 / Math.PI;
    }
};

class Behavior {
    drag: (boolean) => void;
    scrollHandler: ScrollHandler;
    private _opt: BehaviorOptions;
    private resetAnimation: Animation;
    private map: Map;

    onGestureEnd: (() => void) | null = null;

    constructor(mapEl: HTMLElement, map: Map, settings: BehaviorOptions, mapCfg: MapOptions) {
        this.map = map;
        const kinetic = new KineticPanAnimator(map, {
            onStop: () => {
                this.endGesture();
            }
        });
        this.scrollHandler = new ScrollHandler(mapEl, map, settings, mapCfg.zoomAnimationMs);
        let that = this;
        let startX;
        let startY;
        let lastX;
        let lastY;
        let dragged;
        let lastDragTS;
        let GROUP_DRAG_CNT = 8;
        let initalDistance = null;
        let prevSecondaryPointerEndTs = Date.now();
        let dragGrouped;
        const dragDx = [];
        const dragDy = [];

        this._opt = settings || {};

        const gestureThresholdExceeded = (gesture: string, x: number, y: number): boolean => {
            const threshold = mapCfg[gesture];
            return Math.abs(x - startX) > threshold || Math.abs(y - startY) > threshold;
        };

        const resetDrag = () => {
            dragGrouped = 0;
            dragDx.length = 0;
            dragDy.length = 0;
        };

        function getScale(ev) {
            let scale = 1;

            // iOS
            if (ev.scale != UNDEF) {
                return ev.scale;
            }

            let targetTouches = ev.targetTouches;
            let targetLen = targetTouches.length;
            let t1 = targetTouches[targetLen - 1];
            let t2 = targetTouches[targetLen - 2];

            if (t2) {
                let distance = getDistance(
                    t1.clientX,
                    t1.clientY,
                    t2.clientX,
                    t2.clientY
                );

                if (initalDistance == null) {
                    initalDistance = distance;
                }

                scale = distance / initalDistance;
            }


            return scale;
        }

        function panMap(x, y) {
            // DRAG START
            if (!dragged) {
                if (!gestureThresholdExceeded('minPanMapThreshold', x, y)) {
                    return true;
                }
                kinetic.cancel();
            }

            lastDragTS = Date.now();

            if (settings['drag'] && !map.lockViewport()['pan']) {
                const dx = x - lastX;
                const dy = y - lastY;

                if (dragGrouped < GROUP_DRAG_CNT) {
                    dragDx[dragGrouped] = dx;
                    dragDy[dragGrouped] = dy;

                    dragGrouped++;
                } else {
                    dragGrouped = 0;
                }
                that.startGesture('pan');
                map.pan(dx, dy);

                dragged = true;
            }

            lastX = x;
            lastY = y;
        }


        function kineticPan(ev) {
            // DRAG END
            if (dragged) {
                let now = Date.now();

                if (now - lastDragTS < 25) {
                    kinetic.pan(
                        now,
                        dragDx.reduce((a, b) => a + b, 0) * 3,
                        dragDy.reduce((a, b) => a + b, 0) * 3
                    );
                } else {
                    that.endGesture();
                }
            }
        }


        //* ******************** TOUCH *********************

        let startMapRotation;
        let startMapPitch;
        let startAngle;
        let lastScale;
        let startZoomlevel;


        let t1x;
        let t1y;
        let t2x;
        let t2y;

        let lastTime;
        let pitch = null;
        let ticks;

        function onTouchStart(ev) {
            resetDrag();

            let targetTouches = ev.targetTouches;
            let touches = targetTouches.length;
            let pos = getCenter(ev, mapEl);

            lastX = pos[0];
            lastY = pos[1];

            startX = lastX;
            startY = lastY;

            lastScale = getScale(ev);

            dragged = false;

            if (touches == 2) {
                ticks = 0;

                let t1 = targetTouches[touches - 1];
                let t2 = targetTouches[touches - 2];

                t1x = t1.clientX;
                t1y = t1.clientY;
                t2x = t2.clientX;
                t2y = t2.clientY;

                initalDistance = getDistance(t1x, t1y, t2x, t2y);

                startZoomlevel = map.getZoomlevel();

                startMapRotation = map.rotate();
                startMapPitch = map.pitch();

                startAngle = getAngle(ev);

                lastTime = Date.now();
            }
        }


        function onTouchMove(ev) {
            let targetTouches = ev.targetTouches;
            let touches = targetTouches.length;
            let center = getCenter(ev, mapEl);
            let scale = getScale(ev);

            if (touches > 1) {
                if (settings.zoom || settings.rotate || settings.pitch) {
                    that.startGesture('touch');
                }
                if (settings.pitch) {
                    // wait some ticks for better gesture recognition
                    if (++ticks < 5) {
                        ev.preventDefault();
                        return;
                    }

                    const t1 = targetTouches[touches - 1];
                    const t2 = targetTouches[touches - 2];

                    const dy1 = t1y - t1.clientY;
                    const dy2 = t2y - t2.clientY;

                    if (
                        pitch || pitch != false &&
                        Math.abs(t2.clientY - t1.clientY) < TWO_FINGER_PINCH_THRESHOLD &&
                        Math.sign(dy1) == Math.sign(dy2)
                    ) {
                        pitch = true;
                        that.startGesture('pitch');
                        map.pitch(startMapPitch + dy1 * .2);
                        ev.preventDefault();
                        return;
                    }
                    // disable map pitch for this 2 finger gesture
                    pitch = false;
                }

                if (settings.zoom) {
                    that.scrollHandler.zoom(
                        //  log2(2)   ->  1
                        //  log2(1)   ->  0
                        //  log2(0.5) -> -1
                        startZoomlevel + Math.log2(scale),
                        center[0],
                        center[1],
                        false
                    );
                }

                if (settings.rotate) {
                    map.rotate(startMapRotation + getAngle(ev) - startAngle);
                }
                lastScale = scale;
            }

            panMap(center[0], center[1]);

            lastX = center[0];
            lastY = center[1];

            // disable browser's pinch to zoom...
            ev.preventDefault();
        }


        function onTouchEnd(ev) {
            let pos = getCenter(ev, mapEl);
            let targetTouchLength = ev.targetTouches.length;
            pitch = null;

            if (pos) {
                lastX = pos[0];
                lastY = pos[1];

                startX = lastX;
                startY = lastY;
            }

            if (targetTouchLength < 2) {
                initalDistance = null;
            }

            let now = Date.now();
            let delta2ndPointerMs = now - prevSecondaryPointerEndTs;

            if (targetTouchLength) {
                prevSecondaryPointerEndTs = now;
            }

            lastScale = getScale(ev);

            if (targetTouchLength == 0) {
                if (ev.changedTouches.length == 1 && delta2ndPointerMs > 350) {
                    kineticPan(ev);
                } else {
                    that.endGesture();
                }
            }
            // ev.preventDefault();
        }


        //* ******************** MOUSE *********************

        let activeMouseButton: number | null = null;
        let isCameraGesture = false;

        function updateCameraFromMouse(x: number, y: number) {
            if (settings.rotate && gestureThresholdExceeded('minRotateMapThreshold', x, y)) {
                map.rotate(startMapRotation + (lastX - x) * .25);
                that.startGesture('rotate');
            }

            if (settings.pitch && gestureThresholdExceeded('minPitchMapThreshold', x, y)) {
                map.pitch(startMapPitch + (lastY - y) * .1);
                that.startGesture('pitch');
            }
        }

        function onMouseDown(ev) {
            activeMouseButton = ev.button;
            isCameraGesture = ev.button == SECONDARY_MOUSE_BUTTON ||
                (ev.button == PRIMARY_MOUSE_BUTTON &&
                    isPitchAndRotateModifierPressed(ev, settings.pitchAndRotateModifiers));

            resetDrag();

            dragged = false;

            addEventListener(mapEl, 'mousemove', onMouseMove);

            startMapRotation = map.rotate();
            startMapPitch = map.pitch();
            lastX = ev.clientX;
            lastY = ev.clientY;

            startX = lastX;
            startY = lastY;
        }

        function onMouseMove(ev) {
            that.resetAnimation?.stop();

            const x = ev.clientX;
            const y = ev.clientY;

            if (activeMouseButton == PRIMARY_MOUSE_BUTTON && !isCameraGesture) {
                panMap(x, y);
            } else if (isCameraGesture) {
                updateCameraFromMouse(x, y);
            }
        }

        function onMouseUp(ev) {
            activeMouseButton = null;
            isCameraGesture = false;
            removeEventListener(mapEl, 'mousemove', onMouseMove);
            kineticPan(ev);

            if (!dragged && (settings.rotate || settings.pitch)) {
                if (settings.rotate) {
                    const rotation = map.rotate();
                    if (startMapRotation != rotation && Math.abs(rotation) <= MIN_ROTATION) {
                        that.resetAnimation = new Animation(rotation, 0, 500, 'easeOutSine', (a: number) => map.rotate(a));
                        that.resetAnimation.start();
                    }
                }
                that.endGesture();
            }
        }


        // function onResize() {
        //     map.resize(mapEl.offsetWidth, mapEl.offsetHeight);
        // }
        // that.resize = function(enable) {
        //     let toggleEventListener = enable
        //         ? addEventListener
        //         : removeEventListener;
        //
        //     toggleEventListener(WIN, 'resize', onResize);
        // };

        let dragEnabled = false;
        const toggleDragListeners = (enable: boolean) => {
            if (enable && !dragEnabled) return;
            const toggleEventListener = enable ? addEventListener : removeEventListener;
            toggleEventListener(mapEl, 'touchstart', onTouchStart);
            toggleEventListener(WIN, 'touchend', onTouchEnd);
            toggleEventListener(mapEl, 'touchmove', onTouchMove);

            toggleEventListener(mapEl, 'mousedown', onMouseDown);
            // toggleEventListener( mapEl,  'mousemove',  onMouseMove   );
            toggleEventListener(WIN, 'mouseup', onMouseUp);
        };

        that.drag = (enable: boolean) => {
            if (dragEnabled == enable) return;
            dragEnabled = enable;

            if (enable) {
                setTimeout(() => {
                    toggleDragListeners(true);
                }, 0);
            } else {
                // Remove global listeners synchronously so destroyed maps cannot
                // receive a later mouseup or touchend event.
                toggleDragListeners(false);
            }
        };
    }

    private startGesture(t?) {
        this.map._beginCameraGesture();
    }

    private endGesture(t?) {
        if (this.map._endCameraGesture()) {
            this.onGestureEnd?.();
        }
    }

    getOptions() {
        return this._opt;
    };

    scroll(enable: boolean) {
        const {scrollHandler} = this;
        if (enable) {
            scrollHandler.enable();
        } else {
            scrollHandler.disable();
        }
    };
}

export {Behavior, BehaviorOptions};
