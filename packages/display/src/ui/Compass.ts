/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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

import UIComponent from './UIComponent';
import {Animation} from '../animation/Animation';
import Display from '../Map';
import {MapOptions} from '../Config';

const ANIMATION_MS = 500;

type CompassOptions = {
    visible?: boolean
}

class Compass extends UIComponent {
    private _rl: (ev?: any) => void;
    private a: Animation;
    private maxPitch: number;

    constructor(element: HTMLElement, options: CompassOptions, display: Display, mapOptions: MapOptions) {
        super(element, options, display);
        this.maxPitch = mapOptions.maxPitch;
    };

    enable() {
        super.enable();

        const compass = this.querySelector('.needle');
        const display = this.map;

        display.addEventListener('mapviewchange', this._rl = (ev) => {
            compass.style.transform = `rotate(${display.rotate()}deg) rotateX(${display.pitch()}deg) scale(0.7,1.1)`;
        });

        this._rl();
    };

    disable() {
        super.disable();
        this.map.removeEventListener('mapviewchange', this._rl);
        if (this.a) {
            this.a.stop();
            this.a = null;
        }
    };
};

Compass.prototype.listeners = {

    '.needle':
        {
            'click': async function(ev) {
                if (!this.aip) {
                    const {map} = this;
                    const rotation = map.rotate();
                    const pitch = map.pitch();
                    let transform = [0, 0];

                    if (!rotation && !pitch) {
                        transform = [0, this.maxPitch];
                    }

                    this.a = new Animation([rotation, pitch], transform, ANIMATION_MS, 'easeOutCubic', (values) => {
                        map.rotate(values[0]);
                        map.pitch(values[1]);
                    });

                    await this.a.start();

                    this.a = null;
                }
            }
        }
};

Compass.prototype.style = {

    '.compass': '\
        position: absolute;\
        right:  10px;\
        bottom: 96px;\
        text-align: center;\
        font-family: sans-serif;\
        color: white;\
        height: 28px;\
        background-color: #0f1621;\
        user-select: none;\
        border-radius: 4px;\
        font-size: 12px;\
        width: 28px;\
        margin: 2px;\
        overflow: hidden;',

    '.compass .needle': '\
        padding: 4px 0px;\
        line-height: 10px;',

    '.compass:hover': '\
        background-color: #383c45;\
        cursor: pointer;'
};
//
Compass.prototype.templ =
    '<div class="compass">\
        <div class="needle">&#9650;<br>&#9661;</div>\
    </div>';

export default Compass;

