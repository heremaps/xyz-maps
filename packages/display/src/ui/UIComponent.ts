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

import {fromString} from '../DOMTools';
import {Map} from '../Map';
import {MapOptions} from '../MapOptions';

let styleEl;

class UIComponent {
    style: any;
    map: Map;
    listeners: any;
    templ: string;
    html: any;
    _v: boolean = true;
    // class prefix
    cPrefix: string;

    parent: HTMLElement;
    active: boolean;

    protected opt: {};

    constructor(element: HTMLElement, options, map: Map, mapOptions?: MapOptions) {
        let uic = this;
        uic.map = map;

        uic.cPrefix = element.className + '-ui-';

        uic.parent = element;
        uic.opt = options;

        if (options.visible) {
            uic.create(element, options);
            uic.enable();
        }
    }

    show() {
        const uic = this;
        if (!uic.html) {
            uic.create(uic.parent, uic.opt);
        }
        uic.html.style.display = 'inline';
    }

    hide() {
        const el = this.html;
        if (el) {
            el.style.display = 'none';
        }
    }

    enable() {
        const comp = this;
        comp.active = true;
        comp.toggleListeners(true);
    }

    disable() {
        const comp = this;
        comp.active = false;
        comp.toggleListeners(false);
    }

    destroy() {
        const comp = this;
        comp.disable();
        comp.parent.removeChild(comp.html);
    };

    toggleListeners(toggle: boolean) {
        const comp = this;
        const {listeners} = comp;
        for (let selector in listeners) {
            const elems = comp.querySelectorAll(selector);
            for (let type in listeners[selector]) {
                elems.forEach((el) => {
                    const listener = listeners[selector][type];
                    if (toggle) {
                        el.addEventListener(type, listeners[selector][type]._ = listener.bind(comp));
                    } else {
                        el.removeEventListener(type, listener._);
                    }
                });
            }
        }
    }

    insertRule(selector: string, rule: string) {
        styleEl = styleEl || (function addStyleSheet() {
            let style = document.createElement('style');
            document.head.appendChild(style);
            return style;
        })();

        let styleSheet = styleEl.sheet;

        if (styleSheet.insertRule) {
            styleSheet.insertRule(selector + ' {' + rule + '}', styleSheet.cssRules.length);
        } else if (styleSheet.addRule) {
            styleSheet.addRule(selector, rule);
        }
    }


    create(container: HTMLElement, options) {
        let templ = this.templ.replace(/class\=\"/g, 'class="' + this.cPrefix);
        // cleanup html: remove spaces, tabs, newline between elements..
        templ = templ.replace(/\>[\s]+\</g, '><');

        let element = fromString(templ) as HTMLElement;
        let style = element.style;
        let position = options.position;
        let containerClass = '.' + container.className + ' ';

        for (let p in position) {
            style[p] = position[p];
        }

        if (this.style) {
            for (let selector in this.style) {
                this.insertRule(containerClass + this.prefixClass(selector), this.style[selector]);
            }
        }

        this.html = container.appendChild(element);
    }

    // visible(visible: boolean) {
    //     if (visible != UNDEF) {
    //         this._v = !!visible;
    //     }
    //
    //     return this._v;
    // };

    prefixClass(selector: string) {
        selector = selector.replace(/\./g, '.' + this.cPrefix);
        return selector;
    }

    querySelector(selector: string) {
        return this.html.querySelector(this.prefixClass(selector));
    };

    querySelectorAll(selector: string) {
        return this.html.querySelectorAll(this.prefixClass(selector));
    };
}

export default UIComponent;
