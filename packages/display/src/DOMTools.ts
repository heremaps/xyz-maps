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

export const getElAttribute = (elem: HTMLElement, name: string): string => {
    let ret;
    let computedStyle;

    if ((computedStyle = elem.ownerDocument.defaultView.getComputedStyle(elem, null))) {
        ret = computedStyle.getPropertyValue(name);
        if (ret === '') ret = elem.style[name];
    }
    return ret;
};


export const fromString = (string: string): Node => {
    let parser = new DOMParser();
    return parser.parseFromString(string, 'text/html').body.childNodes[0];
};

export const addEventListener = (el: HTMLElement|Window, ev: string | string[], fnc: EventListener, options?: { passive?: boolean, capture?: boolean } | boolean) => {
    (typeof ev === 'string' ? [ev] : ev).forEach((e) => {
        el.addEventListener(e, fnc, options);
    });
};

export const removeEventListener = (el: HTMLElement|Window, ev: string | string[], fnc: EventListener, options?: { passive?: boolean, capture?: boolean } | boolean) => {
    (typeof ev === 'string' ? [ev] : ev).forEach((e) => {
        el.removeEventListener(e, fnc, options);
    });
};


export const setElDimension = (el: HTMLElement, w: string|number, h: string|number) => {
    el.setAttribute('width', <string>w);
    el.setAttribute('height', <string>h);
};

export const appendElementAt = (parent: HTMLElement, element: HTMLElement, index: number) => {
    let children = parent.children;
    parent.insertBefore(element, children.item(index > children.length - 1 ? 0 : children.length - 1 - index));
};

export const getElDimension = (el: HTMLElement, type: string): number => {
    return parseInt(getElAttribute(el, type)) ^ 0;
};

export const setElUserSelect = (el, select) => {
    [
        '-webkit-user-select',
        '-moz-user-select',
        '-ms-user-select',
        'user-select'

    ].forEach(function(us) {
        el.style[us] = select;
    });
};

export const createCanvas = (el: HTMLElement, w: number, h: number, index: number, opacity?: number): HTMLCanvasElement => {
    let c = document.createElement('canvas');
    let style = c.style;
    let children;
    let child;

    setElDimension(c, w, h);

    c.setAttribute('oncontextmenu', 'return false;');

    setElUserSelect(c, 'none');

    style.top =
        style.left = '0px';

    style.position = 'absolute';
    // style.zIndex = index;

    if (opacity != 1) {
        style.opacity = String(opacity);
    }

    // el.appendChild( c );

    el.querySelectorAll('canvas[type=layer]');
    c.setAttribute('type', 'layer');

    children = el.querySelectorAll('canvas');
    child = children[index];


    if (child) {
        el.insertBefore(c, child);
    } else {
        el.appendChild(c);
    }


    return c;
};
