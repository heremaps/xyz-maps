/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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
import {dblclick, drag, mousemove, mousewheel} from 'triggerEvents';
import {userEvent} from 'vitest/browser';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

describe('native coordinate interaction helpers', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:80px;top:120px;width:300px;height:200px;z-index:99999;touch-action:none';
        container.addEventListener('contextmenu', (event) => event.preventDefault());
        container.addEventListener('wheel', (event) => event.preventDefault(), {passive: false});
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    it('double-clicks at map-relative coordinates with trusted events and the existing modifier', async () => {
        const events: MouseEvent[] = [];
        container.addEventListener('dblclick', (event) => events.push(event));
        await dblclick(container, 25, 35);
        expect(events).toHaveLength(1);
        expect(events[0]).toEqual(expect.objectContaining({
            isTrusted: true, clientX: 105, clientY: 155, altKey: true, button: 0, detail: 2
        }));
    });

    it('moves through both endpoints using trusted native hover events', async () => {
        const events: MouseEvent[] = [];
        container.addEventListener('mousemove', (event) => events.push(event));
        await mousemove(container, {x: 10, y: 10}, {x: 70, y: 40});
        expect(events).toEqual(expect.arrayContaining([
            expect.objectContaining({isTrusted: true, clientX: 90, clientY: 130, altKey: true}),
            expect.objectContaining({isTrusted: true, clientX: 150, clientY: 160, altKey: true})
        ]));
    });

    it('refreshes hover at an unchanged position', async () => {
        await mousemove(container, {x: 10, y: 10}, {x: 10, y: 10});
        const events: MouseEvent[] = [];
        container.addEventListener('mousemove', (event) => events.push(event));
        await mousemove(container, {x: 10, y: 10}, {x: 10, y: 10});
        expect(events.length).toBeGreaterThan(0);
        expect(events.every((event) => event.isTrusted && event.clientX === 90 && event.clientY === 130)).toBe(true);
    });

    for (const button of [0, 2]) {
        it(`drags with button ${button}, the requested endpoints, duration and Control modifier`, async () => {
            const down: MouseEvent[] = [];
            const moves: MouseEvent[] = [];
            const up: MouseEvent[] = [];
            container.addEventListener('mousedown', (event) => down.push(event));
            container.addEventListener('mousemove', (event) => moves.push(event));
            container.addEventListener('mouseup', (event) => up.push(event));
            const start = performance.now();
            await drag(container, {x: 10, y: 10}, {x: 60, y: 40}, 60, button, {ctrlKey: true});
            expect(performance.now() - start).toBeGreaterThanOrEqual(60);
            expect(down).toHaveLength(1);
            expect(up).toHaveLength(1);
            expect(down[0]).toEqual(expect.objectContaining({
                isTrusted: true, clientX: 90, clientY: 130, altKey: true, ctrlKey: true, button
            }));
            expect(up[0]).toEqual(expect.objectContaining({
                isTrusted: true, clientX: 140, clientY: 160, altKey: true, ctrlKey: true, button
            }));
            expect(moves).toEqual(expect.arrayContaining([
                expect.objectContaining({isTrusted: true, clientX: 140, clientY: 160, buttons: button === 0 ? 1 : 2})
            ]));
            const pressedMoves = moves.filter((event) => event.buttons !== 0);
            expect(pressedMoves.filter((event) => event.clientX === 140 && event.clientY === 160)).toHaveLength(1);
            await userEvent.hover(container, {position: {x: 80, y: 80}});
            expect(moves[moves.length - 1]).toEqual(expect.objectContaining({altKey: false, ctrlKey: false, buttons: 0}));
        });
    }

    it('wheels at the requested anchor with a trusted pixel delta', async () => {
        const events: WheelEvent[] = [];
        container.addEventListener('wheel', (event) => events.push(event));
        await mousewheel(container, 27, 43, 1);
        expect(events).toHaveLength(1);
        expect(events[0]).toEqual(expect.objectContaining({
            isTrusted: true, clientX: 107, clientY: 163, deltaX: 0, deltaY: -100, deltaMode: 0, altKey: true
        }));
    });

    it('rejects invalid drag duration instead of leaving input pressed', async () => {
        await expect(drag(container, {x: 10, y: 10}, {x: 60, y: 40}, -1))
            .rejects.toThrow('non-negative duration');
        const events: MouseEvent[] = [];
        container.addEventListener('mousemove', (event) => events.push(event));
        await userEvent.hover(container, {position: {x: 80, y: 80}});
        expect(events[events.length - 1]).toEqual(expect.objectContaining({altKey: false, ctrlKey: false, buttons: 0}));
    });
});
