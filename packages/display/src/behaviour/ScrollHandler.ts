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

import {global as WIN} from '@here/xyz-maps-common';
import {addEventListener, removeEventListener} from '../DOMTools';

const isWin = navigator.platform.indexOf('Win') === 0;
const zoomFactor = isWin ? 0.0025 : 0.0015;


export class ScrollHandler {
    private passive = false;
    private el: HTMLElement;
    private settings: any;
    private map: any;
    private ams: number;

    constructor(element: HTMLElement, map, settings, zoomAnimationMs: number) {
        try {
            let opts = Object.defineProperty({}, 'passive', {
                get: () => {
                    this.passive = true;
                }
            });
            window.addEventListener('testPassive', null, opts);
            window.removeEventListener('testPassive', null, opts);
        } catch (e) {
        }

        this.el = element;
        this.settings = settings;
        this.map = map;
        this.ams = zoomAnimationMs ^ 0;

        this.onSpin = this.onSpin.bind(this);
    }

    private onSpin(e) {
        const {settings, el, map} = this;
        const zoomSetting = settings['zoom'];

        if (zoomSetting) {
            e = e || WIN.event;
            let delta = -e.deltaY;

            if (delta) {
                const curZoomlevel = map.getZoomlevel();
                let zoomTo;
                let animate;

                if (zoomSetting == 'fixed') {
                    if (e.shiftKey) {
                        zoomTo = curZoomlevel + (delta > 0 ? .1 : -.1);
                    } else {
                        zoomTo = Math.round(curZoomlevel + (delta < 0 ? -1 : 1));
                        animate = true;
                    }
                } else {
                    zoomTo = curZoomlevel + delta * zoomFactor;
                }
                // use parent node of canvas as its parent node stays static in panning
                let offset = el.getBoundingClientRect();

                this.zoom(zoomTo, e.pageX - offset.left, e.pageY - offset.top, animate);
            }
        }

        // if (!this.passive) {
        e.preventDefault && e.preventDefault();
        e.returnValue = false;
        // }
    }

    enable() {
        addEventListener(this.el, ['wheel', 'DOMMouseScroll'], this.onSpin);
    }

    disable() {
        removeEventListener(this.el, ['wheel', 'DOMMouseScroll'], this.onSpin);
    }

    zoom(toLevel: number, toX: number, toY: number, animate?: boolean) {
        const {map, ams} = this;
        let viewportLock = map.lockViewport();

        if (toLevel >= viewportLock.minLevel && toLevel <= viewportLock.maxLevel) {
            let animationMs = animate && ams;

            map.setZoomlevel(toLevel, toX, toY, animationMs);
        }
    };
}


