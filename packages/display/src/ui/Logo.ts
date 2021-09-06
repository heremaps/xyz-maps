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
// @ts-ignore
import logoSrc from 'ui-logo-src';

type LogoOptions = {
    visible?: boolean,
    url?: string
}

class Logo extends UIComponent {
    constructor(element, options: LogoOptions, display) {
        super(element, options, display);

        const {url} = options;

        if (url) {
            this.setSrc(url);
        }
    }

    private setSrc(url: string) {
        this.html.style.backgroundImage = `url(${url})`;
    }

    getImage(): Promise<{ img: HTMLImageElement, width: number, height: number }> {
        const computedStyle = window.getComputedStyle(this.html);
        const width = Math.round(parseFloat(computedStyle.getPropertyValue('width')));
        const height = Math.round(parseFloat(computedStyle.getPropertyValue('height')));

        return new Promise((resolve) => {
            const img = new Image;
            img.onload = () => resolve({img, width, height});
            img.src = computedStyle.getPropertyValue('background-image').slice(5, -2);
        });
    }
};


Logo.prototype.style = {
    '.logo': '\
        position: absolute;\
        bottom: 6px;\
        left: 6px;\
        z-index: 1;\
        margin:  0px;\
        background-image: url(' + logoSrc + ');\
        background-repeat: no-repeat;\
        background-size: contain;\
        width: 32px;\
        height: 32px;\
        cursor: pointer;'
};

Logo.prototype.templ =
    '<div class="logo"></div>';

export default Logo;

