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

import UIComponent from './UIComponent';
import {JSUtils} from '@here/xyz-maps-common';

class ZoomControl extends UIComponent {
    private _zll: (ev: any) => void;

    constructor(element: HTMLElement, options, display, mapcfg) {
        super(element, options, display);

        let zoomCtrl = this;

        if (mapcfg && mapcfg.zoomAnimationMs) {
            zoomCtrl.ams = mapcfg.zoomAnimationMs;
        }
    };

    enable() {
        super.enable();

        let infoElem = this.querySelector('.info');
        let display = this.display;

        infoElem.innerText = display.getZoomlevel();

        display.addEventListener('mapviewchangeend', this._zll = function(ev) {
            infoElem.innerText = Math.round(display.getZoomlevel() * 10) / 10;
        });
    };

    disable() {
        super.disable();

        this.display.removeEventListener('mapviewchangeend', this._zll);
    };

    ams: 250;
};

ZoomControl.prototype.listeners = {

    '.zoomBtn':
        {
            'click': function(ev) {
                let dir = ev.srcElement.getAttribute('dir') ^ 0;
                this.display.setZoomlevel(this.display.getZoomlevel() + dir, this.ams);
            }
        }
};

ZoomControl.prototype.style = {

    '.zoomctrl': '\
        position: absolute;\
        right:  10px;\
        bottom: 20px;\
        text-align: center;\
        font-family: sans-serif;\
        color: white;\
        user-select: none;',

    '.zoomctrl div': '\
        background-color: #0f1621;\
        border-radius: 4px;\
        font-size: 12px;\
        width: 28px;\
        margin: 2px;',

    '.zoomctrl .zoomBtn': '\
        height: 28px;\
        font-size: 32px;\
        /* border: 1px solid white; */\
        line-height: 22px;\
        font-weight: 200;',

    '.zoomctrl .zoomBtn:hover': '\
        background-color: #383c45;\
        cursor: pointer;'
};

ZoomControl.prototype.templ =
    '<div class="zoomctrl"> \
        <div class="zoomBtn" dir="1">+</div> \
        <div class="info">L</div>\
        <div class="zoomBtn" dir="-1">-</div> \
    </div>';


export default ZoomControl;
