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
import {commands, page, userEvent} from 'vitest/browser';

export function dblclick(elem: HTMLElement, x: number, y: number): Promise<void> {
    return userEvent.dblClick(elem, {position: {x, y}, modifiers: ['Alt']});
}

/** An optional signal cancels the pending click and removes its listeners. */
export function click(elem: HTMLElement, x: number, y: number, button: number = 0, signal?: AbortSignal): Promise<MouseEvent> {
    return new Promise((resolve, reject) => {
        function cleanup() {
            elem.removeEventListener('click', callback);
            signal?.removeEventListener('abort', onAbort);
        }

        function callback(evt: MouseEvent): void {
            cleanup();
            resolve(evt);
        }

        function onAbort() {
            cleanup();
            reject(signal.reason);
        }

        if (signal?.aborted) {
            reject(signal.reason);
            return;
        }

        try {
            let e = getElement(elem, x, y);
            elem.addEventListener('click', callback);
            signal?.addEventListener('abort', onAbort, {once: true});
            dispatchEvent(e, {x, y, type: 'mousedown', button});
            dispatchEvent(e, {x, y, type: 'mouseup', button});
            dispatchEvent(e, {x, y, type: 'click', button});
        } catch (error) {
            cleanup();
            reject(error);
        }
    });
}

export function drag(elem: HTMLElement, from: { x: number; y: number }, to: {
    x: number;
    y: number
}, time: number = 60, button: number = 0, modifiers?: { metaKey?: boolean; ctrlKey?: boolean }): Promise<void> {
    const nativeButton = button === 0 ? 'left' : button === 1 ? 'middle' : button === 2 ? 'right' : undefined;
    if (!nativeButton) return Promise.reject(new RangeError(`Unsupported drag button: ${button}`));
    return commands.mapDrag(page.elementLocator(elem).selector, from, to, {
        duration: time,
        button: nativeButton,
        modifiers: ['Alt', ...(modifiers?.ctrlKey ? ['Control' as const] : []), ...(modifiers?.metaKey ? ['Meta' as const] : [])]
    });
}

export async function mousemove(elem: HTMLElement, from: { x: number, y: number }, to: {
    x: number,
    y: number
}): Promise<void> {
    await userEvent.hover(elem, {position: from, modifiers: ['Alt']});
    await userEvent.hover(elem, {position: to, modifiers: ['Alt']});
    await new Promise<void>((resolve) => setTimeout(resolve, 75));
}

export async function mousewheel(elem: HTMLElement, x: number, y: number, d: number): Promise<void> {
    let onWheel: () => void;
    let timer: ReturnType<typeof setTimeout>;
    const event = new Promise<void>((resolve) => {
        onWheel = resolve;
    });
    const timeoutError = new Error('Timed out waiting for native wheel input');
    const timeout = new Promise<never>((resolve, reject) => {
        timer = setTimeout(() => reject(timeoutError), 2000);
    });
    try {
        elem.addEventListener('wheel', onWheel);
        await Promise.race([
            Promise.all([event, commands.mapWheel(page.elementLocator(elem).selector, {x, y}, -100 * d)]),
            timeout
        ]);
    } finally {
        clearTimeout(timer);
        elem.removeEventListener('wheel', onWheel);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
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
