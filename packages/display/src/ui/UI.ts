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

import {JSUtils} from '@here/xyz-maps-common';
import ZoomControl from './ZoomControl';
import Copyright from './copyright/Copyright';
import Logo from './Logo';

const Components = {

    ZoomControl: ZoomControl,
    Copyright: Copyright,
    Logo: Logo

};
const defaultOptions = {

    Copyright: {
        visible: true
    },

    ZoomControl: {
        visible: true
    },

    Logo: {
        visible: true
    }
};

let UNDEF;

class UI {
    components: any;
    el: HTMLElement;

    constructor(element: HTMLElement, mapfcg, display) {
        const ui = this;
        let uiOptions = {...mapfcg['UI'] || mapfcg['ui'] || {}};
        let uiComponents = ui.components = {};

        ui.el = element;

        // fallback: generic Logo Component was previously HERE specific
        if (uiOptions.HERE != UNDEF) {
            uiOptions.Logo = uiOptions.HERE;
        }

        uiOptions = JSUtils.extend(true,
            JSUtils.clone(defaultOptions),
            uiOptions
        );

        for (let c in uiOptions) {
            let opt = uiOptions[c];

            if (opt.visible && Components[c]) {
                // ui[c] = new Components[c]( uiContainer, opt, display )
                uiComponents[c] = new Components[c](element, opt, display, mapfcg);
            }
        }
    }

    destroy() {
        const element = this.el;
        const components = this.components;
        for (let name in components) {
            components[name].disable();
        }
        element.parentNode.removeChild(element);
    };
};

export default UI;
