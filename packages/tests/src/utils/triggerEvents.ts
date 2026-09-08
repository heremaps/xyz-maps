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

        dispatchEvent(e, {x, y, type: 'mousedown'});
        dispatchEvent(e, {x, y, type: 'mouseup'});
        dispatchEvent(e, {x, y, type: 'click'});

        dispatchEvent(e, {x, y, type: 'mousedown'});
        dispatchEvent(e, {x, y, type: 'mouseup'});
        dispatchEvent(e, {x, y, type: 'click'});

        dispatchEvent(e, {x, y, type: 'dblclick'});
    });
}

export function click(elem: HTMLElement, x: number, y: number, button: number = 0): Promise<MouseEvent> {
    return new Promise((resolve, reject) => {
        let e = getElement(elem, x, y);

        function callback(evt: MouseEvent): void {
            resolve(evt);
            elem.removeEventListener('click', callback);
        }

        elem.addEventListener('click', callback);

        dispatchEvent(e, {x, y, type: 'mousedown', button});
        dispatchEvent(e, {x, y, type: 'mouseup', button});
        dispatchEvent(e, {x, y, type: 'click', button});
    });
}

export function drag(elem: HTMLElement, from: { x: number; y: number }, to: {
    x: number;
    y: number
}, time: number = 60, button: number = 0, modifiers?: { metaKey?: boolean; ctrlKey?: boolean }): Promise<MouseEvent> {
    return new Promise((resolve) => {
        let e = getElement(elem, from.x, from.y);

        function callback(evt: MouseEvent): void {
            resolve(evt);
            elem.removeEventListener('mouseup', callback);
        }

        elem.addEventListener('mouseup', callback);

        dispatchEvent(e, {x: from.x, y: from.y, type: 'mousedown', button, ...modifiers});

        let v = Math.max(1, Math.floor(Math.max(Math.abs(to.x - from.x) / 10, Math.abs(to.y - from.y) / 10)));
        let vx = (to.x - from.x) / v;
        let vy = (to.y - from.y) / v;
        let i = 0;
        let si = setInterval(function() {
            if (i++ == v - 1) {
                dispatchEvent(e, {x: to.x, y: to.y, type: 'mousemove', button, ...modifiers});
                setTimeout(() => dispatchEvent(e, {x: to.x, y: to.y, type: 'mouseup', button}), 1);
                clearInterval(si);
            }
            dispatchEvent(e, {
                x: Math.floor(from.x + vx * i),
                y: Math.floor(from.y + vy * i),
                type: 'mousemove',
                button,
                ...modifiers
            });
        }, time / v);
    });
}

export function mousemove(elem: HTMLElement, from: { x: number, y: number }, to: {
    x: number,
    y: number
}): Promise<MouseEvent> {
    return new Promise((resolve) => {
        let e = getElement(elem, from.x, from.y);
        let v = Math.max(Math.abs(to.x - from.x) / 2, Math.abs(to.y - from.y) / 2);
        let vx = (to.x - from.x) / v;
        let vy = (to.y - from.y) / v;
        let evtNr = 0;

        function callback(evt: MouseEvent): void {
            if (++evtNr == Math.floor(v) + 1) {
                elem.removeEventListener('mousemove', callback);
                // The 75 ms timeout allows the browser's event loop and JavaScript engine enough time
                // to process all dispatched mousemove events before resolving the promise.
                // This delay is timing-critical: if too short, some events may not be handled;
                // if too long, tests slow down. The optimal value depends on browser internals and system performance.
                // Adjust for reliability in your environment.
                setTimeout(() => resolve(evt), 75);
            }
        }

        elem.addEventListener('mousemove', callback);

        for (let i = 0; i < v; i++) {
            dispatchEvent(e, {
                x: from.x + Math.floor(vx * i),
                y: from.y + Math.floor(vy * i),
                type: 'mousemove'
            });
        }
        dispatchEvent(e, {x: to.x, y: to.y, type: 'mousemove'});
    });
}

export function mousewheel(elem: HTMLElement, x: number, y: number, d: number): Promise<MouseEvent> {
    const event = 'wheel';
    const direction = -1;

    return new Promise((resolve) => {
        const e = getElement(elem, x, y);

        function callback(evt: MouseEvent): void {
            setTimeout(function() {
                resolve(evt);
            }, 20);
            elem.removeEventListener(event, callback);
        }

        elem.addEventListener(event, callback);

        dispatchEvent(e, {x, y, type: event, delta: d * direction}); // Gecko
    });
}

export function triggerEvent(elem: HTMLElement, x: number, y: number, evt: string, d: number): void {
    const e = getElement(elem, x, y);
    dispatchEvent(e, {x, y, type: evt, delta: d});
}

function getElement(elem: HTMLElement, x: number, y: number): {
    element: Element;
    topLeft: { left: number; top: number }
} {
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
        topLeft: tl
    };
}

function getButtonMask(button: number): number {
    return button == 0
        ? 1 // primary
        : button == 2
            ? 2 // secondary
            : 0;
}

type DispatchTarget = {
    element: Element;
    topLeft: {
        top: number;
        left: number
    };
};

type DispatchEventParams = {
    x: number;
    y: number;
    type: string;
    button?: number;
    delta?: number;
    metaKey?: boolean;
    ctrlKey?: boolean;
};

function dispatchEvent(
    {element, topLeft}: DispatchTarget,
    {x, y, type, button, delta, metaKey, ctrlKey}: DispatchEventParams
) {
    const eventButton = type == 'mousemove' ? 0 : button ?? 0;
    const buttons = button != undefined &&
        (type == 'mousedown' || type == 'mousemove')
        ? getButtonMask(button)
        : 0;

    let ev: any = new MouseEvent(type, {
        altKey: true,
        metaKey: !!metaKey,
        ctrlKey: !!ctrlKey,
        bubbles: true,
        cancelable: true,
        clientX: x + topLeft.top,
        clientY: y + topLeft.left,
        button: eventButton,
        buttons
    });

    if (delta) {
        ev.deltaX = 0;
        ev.deltaY = 100 * delta;
        ev.deltaZ = 0;

        ev.wheelDelta = 120 * delta;
        ev.wheelDeltaX = 0;
        ev.wheelDeltaY = 120 * delta;
    }

    element.dispatchEvent(ev);
}
