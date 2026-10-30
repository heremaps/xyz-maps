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
import type {BrowserCommand, BrowserCommandContext} from 'vitest/node';
import type {MapDragOptions, MapPosition} from './types.ts';

async function origin(context: BrowserCommandContext, selector: string) {
    const box = await context.iframe.locator(selector).boundingBox({timeout: 2000});
    if (!box) throw new Error('Map interaction target has no visible layout box');
    return box;
}

async function withModifiers(
    context: BrowserCommandContext,
    modifiers: MapDragOptions['modifiers'],
    action: () => Promise<void>
) {
    const pressed: string[] = [];
    try {
        for (const modifier of modifiers) {
            await context.page.keyboard.down(modifier);
            pressed.push(modifier);
        }
        await action();
    } finally {
        for (const modifier of pressed.reverse()) {
            await context.page.keyboard.up(modifier);
        }
    }
}

export const mapDrag: BrowserCommand<[string, MapPosition, MapPosition, MapDragOptions], void> =
    async (context, selector, from, to, options) => {
        if (![from.x, from.y, to.x, to.y, options.duration].every(Number.isFinite) || options.duration < 0) {
            throw new RangeError('Map drag requires finite coordinates and a non-negative duration');
        }
        const box = await origin(context, selector);
        await withModifiers(context, options.modifiers, async () => {
            const mouse = context.page.mouse;
            await mouse.move(box.x + from.x, box.y + from.y);
            await mouse.down({button: options.button});
            try {
                const steps = Math.max(1, Math.floor(Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) / 10));
                const started = performance.now();
                for (let step = 1; step <= steps; step++) {
                    const x = step === steps ? to.x : Math.floor(from.x + (to.x - from.x) * step / steps);
                    const y = step === steps ? to.y : Math.floor(from.y + (to.y - from.y) * step / steps);
                    await mouse.move(box.x + x, box.y + y);
                    const remaining = started + options.duration * step / steps - performance.now();
                    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
                }
            } finally {
                await mouse.up({button: options.button});
            }
        });
    };

export const mapWheel: BrowserCommand<[string, MapPosition, number], void> =
    async (context, selector, position, deltaY) => {
        if (![position.x, position.y, deltaY].every(Number.isFinite)) {
            throw new RangeError('Map wheel requires finite coordinates and delta');
        }
        const box = await origin(context, selector);
        await withModifiers(context, ['Alt'], async () => {
            await context.page.mouse.move(box.x + position.x, box.y + position.y);
            await context.page.mouse.wheel(0, deltaY);
        });
    };
