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

import UIComponent from '../UIComponent';
import {CopyrightSource} from './CopyrightSource';


const createElement = (type: string, className?: string, innerText?: string, parent?: HTMLElement) => {
    const el = document.createElement(type);
    if (className) {
        el.className = className;
    }
    if (innerText) {
        el.innerText = innerText;
    }
    if (parent) {
        parent.appendChild(el);
    }
    return el;
};

class CopyrightDetails extends UIComponent {
    private data: CopyrightSource[];

    constructor(element, options, display) {
        super(element, options, display);
    };

    private add(data: CopyrightSource) {
        // const el = this.html;
        const el = createElement('div', this.prefixClass('.src').substr(1), '© ' + data.label, this.html);
    }

    setData(data: CopyrightSource[]) {
        const uic = this;
        uic.data = data;

        if (uic.html) {
            uic.html.innerText = '';

            for (let d of data) {
                uic.add(d);
            }
        }
    }
};


CopyrightDetails.prototype.style = {
    '.copyright-popup': '\
        user-select: none;\
        background-color: rgba(0,0,0,0.1);\
        position: absolute;\
        bottom: 15px;\
        padding: 2px;\
        right: 120px;\
        z-index: 1;\
        width:  auto;\
        color: #fff;\
        font-family: arial;\
        font-size: 11px;\
        opacity: 0.8;\
        height: auto;',

    '.src': '\
        opacity: 0.8;\
        margin: 4px;\
    '
};

CopyrightDetails.prototype.templ =
    '<div class="copyright-popup"></div>';

export default CopyrightDetails;

