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
import {waitForPointerEvent} from '@test/synchronization/pointer';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

function fixture() {
    const listeners = new Set<() => void>();
    return {
        listeners,
        addEventListener: vi.fn((type: string, listener: () => void) => listeners.add(listener)),
        removeEventListener: vi.fn((type: string, listener: () => void) => listeners.delete(listener)),
        emit() {
            listeners.forEach((listener) => listener());
        }
    };
}

describe('pointer-event synchronization', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        try {
            expect(vi.getTimerCount()).toBe(0);
        } finally {
            vi.useRealTimers();
            vi.restoreAllMocks();
        }
    });

    it('registers before the action and waits for action completion after the event', async () => {
        const target = fixture();
        let completed = false;
        const pending = waitForPointerEvent(target, 'pointermove', async () => {
            expect(target.listeners.size).toBe(1);
            target.emit();
            await new Promise<void>((resolve) => setTimeout(resolve, 100));
        }).then(() => completed = true);
        await vi.advanceTimersByTimeAsync(99);
        expect(completed).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await pending;
        expect(completed).toBe(true);
        expect(target.listeners.size).toBe(0);
    });

    it('does not run the action after partial registration failure', async () => {
        const target = fixture();
        const action = vi.fn();
        const error = new Error('Pointer subscription failed');
        target.addEventListener.mockImplementationOnce((type, listener) => {
            target.listeners.add(listener);
            throw error;
        });

        await expect(waitForPointerEvent(target, 'pointerenter', action)).rejects.toBe(error);
        expect(action).not.toHaveBeenCalled();
        expect(target.listeners.size).toBe(0);
    });

    it('propagates action failure and removes the event listener', async () => {
        const target = fixture();
        const error = new Error('Pointer action failed');
        await expect(waitForPointerEvent(target, 'pointerleave', () => {
            throw error;
        })).rejects.toBe(error);
        expect(target.listeners.size).toBe(0);
    });

    for (const eventArrived of [false, true]) {
        it(`enforces the deadline when ${eventArrived ? 'the action never finishes' : 'the event never arrives'}`, async () => {
            const target = fixture();
            const pending = waitForPointerEvent(target, 'pointermove', () => {
                if (eventArrived) {
                    target.emit();
                    return new Promise<void>(() => {});
                }
            }).then(() => null, (error: Error) => error);

            await vi.advanceTimersByTimeAsync(2000);
            expect((await pending).message).toBe('Timed out waiting for pointermove');
            expect(target.listeners.size).toBe(0);
        });
    }

    it('reports cleanup failures', async () => {
        const target = fixture();
        const error = new Error('Pointer unsubscribe failed');
        target.removeEventListener.mockImplementationOnce((type, listener) => {
            target.listeners.delete(listener);
            throw error;
        });

        await expect(waitForPointerEvent(target, 'pointermove', () => target.emit())).rejects.toBe(error);
        expect(target.listeners.size).toBe(0);
    });
});
