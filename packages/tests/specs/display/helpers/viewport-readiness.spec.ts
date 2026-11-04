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
import {Map} from '@here/xyz-maps-display';
import {waitForViewportReady} from 'displayUtils';
import {vi, describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('Viewport readiness', () => {
    let display: Map;

    beforeEach(() => {
        display = new Map(document.getElementById('map'), {
            center: {longitude: 0, latitude: 0},
            zoomlevel: 18,
            layers: []
        });
    });

    afterEach(() => {
        display.destroy();
    });

    it('propagates synchronous action errors', async () => {
        const expected = new Error('viewport action failed');
        let received: unknown;
        try {
            await waitForViewportReady(display, () => {
                throw expected;
            });
        } catch (error) {
            received = error;
        }
        expect(received).toBe(expected);
    });

    it('propagates asynchronous action errors', async () => {
        const expected = new Error('async viewport action failed');
        let received: unknown;
        try {
            await waitForViewportReady(display, async () => {
                throw expected;
            });
        } catch (error) {
            received = error;
        }
        expect(received).toBe(expected);
    });

    it('waits for the action as well as viewport readiness', async () => {
        let actionDone = false;
        await waitForViewportReady(display, async () => {
            await new Promise<void>((resolve) => setTimeout(resolve, 200));
            actionDone = true;
        });
        expect(actionDone).toBe(true);
    });

    it('reports missing readiness signals instead of hanging', async () => {
        await waitForViewportReady(display);
        vi.useFakeTimers();
        try {
            const result = waitForViewportReady(display).then(() => null, (error: Error) => error);
            await vi.advanceTimersByTimeAsync(10000);
            const error = await result;
            expect(error?.message).toContain('mapviewchangeend=false');
            expect(error?.message).toContain('starts=0, ends=0');
            expect(vi.getTimerCount()).toBe(0);
        } finally {
            vi.useRealTimers();
        }
    });
});
