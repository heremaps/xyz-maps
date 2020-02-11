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
import {global as WIN} from '@here/xyz-maps-common';
import {ScrollHandler} from './ScrollHandler';


let UNDEF;

type BehaviourOptions = {
    zoom: boolean | 'fixed' | 'float';
    drag: boolean;
    rotate: boolean;
}

const getCenter = (ev: TouchEvent | MouseEvent, mapEl: HTMLElement) => {
    let targetTouches = (<TouchEvent>ev).targetTouches;
    let x: number;
    let y: number;

    if (targetTouches) {
        let targetLen = targetTouches.length;
        let p1 = targetTouches[targetLen - 1];
        let p2;

        if (targetLen) {
            let offset = mapEl.getBoundingClientRect();
            let p1x = p1.pageX - offset.left;
            let p1y = p1.pageY - offset.top;

            if (targetLen > 1) {
                p2 = targetTouches[targetLen - 2];

                x = (p1x + p2.pageX - offset.left) / 2,
                y = (p1y + p2.pageY - offset.top) / 2;
            } else {
                x = p1x;
                y = p1y;
            }
        }
    } else {
        x = (<MouseEvent>ev).clientX;
        y = (<MouseEvent>ev).clientY;
    }

    return [x ^ 0, y ^ 0];
};

const getAngle = (ev: TouchEvent) => {
    // iOS
    const rotation = {ev};
    if (rotation != UNDEF) {
        return rotation;
    }

    let targetTouches = ev.targetTouches;
    let targetLen = targetTouches.length;
    let p1 = targetTouches[targetLen - 1];
    let p2 = targetTouches[targetLen - 2];


    if (p2) {
        let x = p2.clientX - p1.clientX;
        let y = p2.clientY - p1.clientY;

        return Math.atan2(y, x) * 180 / Math.PI;
    }
};

const getDistance = (p1x: number, p1y: number, p2x: number, p2y: number) => {
    return Math.sqrt(Math.pow((p1x - p2x), 2) + Math.pow((p1y - p2y), 2));
};


class Behaviour {
    drag: (boolean) => void;
    scroll: (boolean) => void;
    scrollHandler: ScrollHandler;
    getOptions: ()=>BehaviourOptions;

    constructor(mapEl: HTMLElement, map, kinetic, settings: BehaviourOptions, mapCfg) {
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

        console.log(mapEl);

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
                let threshold = mapCfg['minPanMapThreshold'];
                if (
                    Math.abs(x - startX) < threshold && Math.abs(y - startY) < threshold
                ) {
                    return true;
                }
                kinetic.cancel();
            }

            lastDragTS = Date.now();

            if (settings['drag'] && !map.lockViewport()['pan']) {
                let dx = x - lastX;
                let dy = y - lastY;

                if (dragGrouped < GROUP_DRAG_CNT) {
                    dragDx[dragGrouped] = dx;
                    dragDy[dragGrouped] = dy;

                    dragGrouped++;
                } else {
                    dragGrouped = 0;
                }

                map.pan(
                    dx, dy
                    // dragDx = x - lastX,
                    // dragDy = y - lastY
                );
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
                }
            }
        }


        //* ******************** TOUCH *********************

        let startMapRotation;
        let startMapPitch;
        let startAngle;
        // var lastCenter;
        let lastScale;
        let startZoomlevel;


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
                let t1 = targetTouches[touches - 1];
                let t2 = targetTouches[touches - 2];

                initalDistance = getDistance(
                    t1.clientX,
                    t1.clientY,
                    t2.clientX,
                    t2.clientY
                );

                startZoomlevel = map.getZoomlevel();

                startMapRotation = map.rotate();
                startMapPitch = map.pitch();

                startAngle = getAngle(ev);
            }

            // if default is prevent browser won't trigger click events anymore
            // ev.preventDefault();
        }


        function onTouchMove(ev) {
            let center = getCenter(ev, mapEl);
            let scale = getScale(ev);

            panMap(center[0], center[1]);

            if (ev.targetTouches.length > 1) {
                that.scrollHandler.zoom(
                    //  log2(2)   ->  1
                    //  log2(1)   ->  0
                    //  log2(0.5) -> -1
                    startZoomlevel + Math.log2(scale),
                    center[0],
                    center[1],
                    false
                );

                // map.zoom(scale - lastScale, center[0], center[1]);
                // console.log(  ' _SCALE: '+ scale + ', '+ lastScale +' -> ' +( scale - lastScale)+ ' total: '+scl);
                // map.rotate( startMapRotation + getAngle(ev) - startAngle, center[0], center[1] );

                lastScale = scale;
            }

            lastX = center[0];
            lastY = center[1];

            // disable browser's pinch to zoom...
            ev.preventDefault();
        }


        function onTouchEnd(ev) {
            let pos = getCenter(ev, mapEl);
            let targetTouchLength = ev.targetTouches.length;

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

            if (targetTouchLength == 0 &&
                ev.changedTouches.length == 1 &&
                delta2ndPointerMs > 350
            ) {
                kineticPan(ev);
            }
            // ev.preventDefault();
        }


        //* ******************** MOUSE *********************

        // 0 -> left, 2 -> right, null -> NONE
        let mouseButtonPressed = null;

        function onMouseDown(ev) {
            mouseButtonPressed = ev.button;

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
            if (mouseButtonPressed == 0) {
                panMap(ev.clientX, ev.clientY);
            } else if (mouseButtonPressed == 2) {
                if (settings['rotate']) {
                    map.rotate(startMapRotation + (lastX - ev.clientX) * .25);

                    if (settings['pitch']) {
                        map.pitch(startMapPitch + (lastY - ev.clientY) * .1);
                    }
                }
            }
        }

        function onMouseUp(ev) {
            mouseButtonPressed = null;
            removeEventListener(mapEl, 'mousemove', onMouseMove);

            if (dragged) {
                kineticPan(ev);
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

        that.scroll = (enable: boolean) => {
            let {scrollHandler} = this;

            if (enable) {
                scrollHandler.enable();
            } else {
                scrollHandler.disable();
            }
        };

        that.drag = (enable: boolean) => {
            const toggleEventListener = enable ? addEventListener : removeEventListener;

            setTimeout(() => {
                toggleEventListener(mapEl, 'touchstart', onTouchStart);
                toggleEventListener(WIN, 'touchend', onTouchEnd);
                toggleEventListener(mapEl, 'touchmove', onTouchMove);

                toggleEventListener(mapEl, 'mousedown', onMouseDown);
                // toggleEventListener( mapEl,  'mousemove',  onMouseMove   );
                toggleEventListener(WIN, 'mouseup', onMouseUp);
            }, 0);
        };

        that.getOptions = () => {
            return settings;
        };
    }
}

export {Behaviour, BehaviourOptions};
