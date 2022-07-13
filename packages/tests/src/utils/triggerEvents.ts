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
export function dblclick(elem: HTMLElement, x: number, y: number): Promise<MouseEvent> {
    return new Promise((resolve, reject) => {
        let e = getElement(elem, x, y);

        function callback(evt: MouseEvent): void {
            resolve(evt);
            elem.removeEventListener('dblclick', callback);
        }

        elem.addEventListener('dblclick', callback);

        dispatchEvent(e.element, e.topleft, x, y, 'mousedown');
        dispatchEvent(e.element, e.topleft, x, y, 'mouseup');
        dispatchEvent(e.element, e.topleft, x, y, 'click');

        dispatchEvent(e.element, e.topleft, x, y, 'mousedown');
        dispatchEvent(e.element, e.topleft, x, y, 'mouseup');
        dispatchEvent(e.element, e.topleft, x, y, 'click');

        dispatchEvent(e.element, e.topleft, x, y, 'dblclick');
    });
}

export function click(elem: HTMLElement, x: number, y: number): Promise<MouseEvent> {
    return new Promise((resolve, reject) => {
        let e = getElement(elem, x, y);

        function callback(evt: MouseEvent): void {
            resolve(evt);
            elem.removeEventListener('click', callback);
        }

        elem.addEventListener('click', callback);

        dispatchEvent(e.element, e.topleft, x, y, 'mousedown');
        dispatchEvent(e.element, e.topleft, x, y, 'mouseup');
        dispatchEvent(e.element, e.topleft, x, y, 'click');
    });
}

export function drag(elem: HTMLElement, from: { x: number; y: number }, to: { x: number; y: number }, time: number = 60): Promise<MouseEvent> {
    return new Promise((resolve) => {
        let e = getElement(elem, from.x, from.y);

        function callback(evt: MouseEvent): void {
            resolve(evt);
            elem.removeEventListener('mouseup', callback);
        }

        elem.addEventListener('mouseup', callback);

        dispatchEvent(e.element, e.topleft, from.x, from.y, 'mousedown');

        let v = Math.max(1, Math.floor(Math.max(Math.abs(to.x - from.x) / 10, Math.abs(to.y - from.y) / 10)));
        let vx = (to.x - from.x) / v;
        let vy = (to.y - from.y) / v;
        let i = 0;
        let si = setInterval(function() {
            if (i++ == v - 1) {
                dispatchEvent(e.element, e.topleft, to.x, to.y, 'mousemove');
                setTimeout(() => dispatchEvent(e.element, e.topleft, to.x, to.y, 'mouseup'), 1);
                clearInterval(si);
            }
            dispatchEvent(e.element, e.topleft, Math.floor(from.x + vx * i), Math.floor(from.y + vy * i), 'mousemove');
        }, time / v);
    });
}

export function mousemove(elem: HTMLElement, from: { x: number, y: number }, to: { x: number, y: number }): Promise<MouseEvent> {
    return new Promise((resolve) => {
        let e = getElement(elem, from.x, from.y);
        let v = Math.max(Math.abs(to.x - from.x) / 2, Math.abs(to.y - from.y) / 2);
        let vx = (to.x - from.x) / v;
        let vy = (to.y - from.y) / v;
        let evtNr = 0;

        function callback(evt: MouseEvent): void {
            if (++evtNr == Math.floor(v) + 1) {
                setTimeout(function() {
                    resolve(evt);
                }, 50);
                elem.removeEventListener('mousemove', callback);
            }
        }

        elem.addEventListener('mousemove', callback);

        for (let i = 0; i < v; i++) {
            dispatchEvent(e.element, e.topleft, from.x + Math.floor(vx * i), from.y + Math.floor(vy * i), 'mousemove');
        }
        dispatchEvent(e.element, e.topleft, to.x, to.y, 'mousemove');
    });
}

export function mousewheel(elem: HTMLElement, x: number, y: number, d: number): Promise<MouseEvent> {
    const event = 'wheel';
    const direction = -1;

    return new Promise((resolve) => {
        let e = getElement(elem, x, y);

        function callback(evt: MouseEvent): void {
            setTimeout(function() {
                resolve(evt);
            }, 20);
            elem.removeEventListener(event, callback);
        }

        elem.addEventListener(event, callback);

        dispatchEvent(e.element, e.topleft, x, y, event, d * direction); // Gecko
    });
}

export function triggerEvent(elem: HTMLElement, x: number, y: number, evt: string, d: number): void {
    let e = getElement(elem, x, y);
    dispatchEvent(e.element, e.topleft, x, y, evt, d);
}

function getElement(elem: HTMLElement, x: number, y: number): { element: Element; topleft: { left: number; top: number } } {
    function getPosition(div) {
        var T = 0;
        var L = 0;

        while (div) {
            L += div.offsetLeft;
            T += div.offsetTop;
            div = div.offsetParent;
        }
        return {left: L, top: T};
    }

    const tl: { left: number, top: number } = getPosition(elem);

    return {
        element: document.elementFromPoint(x + tl.top, y + tl.left),
        topleft: tl
    };
}

function dispatchEvent(elem: Element, tl: { top: number; left: number }, x: number, y: number, evt: string, d?: number) {
    let ev: any = new MouseEvent(evt, {
        altKey: true,
        bubbles: true,
        cancelable: true,
        clientX: x + tl.top,
        clientY: y + tl.left
    });

    if (d) {
        ev.deltaX = 0;
        ev.deltaY = 100 * d;
        ev.deltaZ = 0;

        ev.wheelDelta = 120 * d;
        ev.wheelDeltaX = 0;
        ev.wheelDeltaY = 120 * d;
    }

    elem.dispatchEvent(ev);
}

