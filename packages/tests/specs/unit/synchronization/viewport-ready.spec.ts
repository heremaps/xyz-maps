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
import {waitForViewportReady} from '@test/synchronization/viewport';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

function layer(id: string) {
    const listeners = new Set<(event: CustomEvent) => void>();
    const target = {
        id,
        addEventListener: vi.fn((type: string, listener: (event: CustomEvent) => void) => {
            listeners.add(listener);
        }),
        removeEventListener: vi.fn((type: string, listener: (event: CustomEvent) => void) => {
            listeners.delete(listener);
        })
    };
    return {
        target,
        listeners,
        ready() {
            listeners.forEach((listener) => listener(new CustomEvent('viewportReady', {detail: {layer: target}})));
        }
    };
}

function fixture() {
    const first = layer('first');
    const second = layer('second');
    const listeners = new Map<string, Set<() => void>>();
    const display = {
        getLayers: vi.fn(() => [first.target, second.target]),
        addEventListener: vi.fn((type: string, listener: () => void) => {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(listener);
        }),
        removeEventListener: vi.fn((type: string, listener: () => void) => {
            listeners.get(type)?.delete(listener);
        })
    };
    return {
        display, first, second, listeners,
        emit(type: string) {
            listeners.get(type)?.forEach((listener) => listener());
        }
    };
}

function expectCleanedUp(target: ReturnType<typeof fixture>) {
    expect(target.first.listeners.size).toBe(0);
    expect(target.second.listeners.size).toBe(0);
    expect([...target.listeners.values()].every((listeners) => listeners.size === 0)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
}

describe('viewport readiness state', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    for (const change of ['mapviewchangestart', 'mapviewchange']) {
        it(`requires all layers again after ${change} during the action`, async () => {
            const target = fixture();
            let finishAction: () => void;
            let completed = false;
            const pending = waitForViewportReady(target.display, () => new Promise<void>((resolve) => {
                finishAction = resolve;
            })).then(() => {
                completed = true;
            });
            await vi.advanceTimersByTimeAsync(0);
            target.emit('mapviewchangestart');
            target.first.ready();
            target.second.ready();
            target.emit('mapviewchangeend');
            await vi.advanceTimersByTimeAsync(10);
            expect(completed).toBe(false);
            target.emit(change);
            target.first.ready();
            target.emit('mapviewchangeend');
            finishAction();
            await vi.advanceTimersByTimeAsync(10);
            expect(completed).toBe(false);
            target.second.ready();
            await pending;
            expect(completed).toBe(true);
            expectCleanedUp(target);
        });
    }

    it('registers all signals before invoking the action and returns the original display', async () => {
        const target = fixture();
        const action = vi.fn(() => {
            expect(target.listeners.size).toBe(3);
            expect(target.first.listeners.size).toBe(1);
            expect(target.second.listeners.size).toBe(1);
            target.emit('mapviewchangeend');
            target.first.ready();
            target.second.ready();
        });
        const pending = waitForViewportReady(target.display, action);
        expect(action).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(10);
        expect(await pending).toBe(target.display);
        expectCleanedUp(target);
    });

    for (const layersFirst of [true, false]) {
        it(`accepts layer readiness ${layersFirst ? 'before' : 'after'} the settled view end`, async () => {
            const target = fixture();
            const pending = waitForViewportReady(target.display);
            target.emit('mapviewchangestart');
            if (layersFirst) {
                target.first.ready();
                target.second.ready();
            }
            target.emit('mapviewchangeend');
            await vi.advanceTimersByTimeAsync(10);
            if (!layersFirst) {
                target.first.ready();
                target.second.ready();
            }
            expect(await pending).toBe(target.display);
            expectCleanedUp(target);
        });
    }

    it('invalidates an end event when another view starts during the settling window', async () => {
        const target = fixture();
        let completed = false;
        const pending = waitForViewportReady(target.display).then(() => completed = true);
        target.first.ready();
        target.second.ready();
        target.emit('mapviewchangeend');
        await vi.advanceTimersByTimeAsync(9);
        target.emit('mapviewchangestart');
        await vi.advanceTimersByTimeAsync(1);
        expect(completed).toBe(false);
        target.emit('mapviewchangeend');
        target.first.ready();
        target.second.ready();
        await vi.advanceTimersByTimeAsync(10);
        await pending;
        expectCleanedUp(target);
    });

    it('deduplicates explicitly selected layers without waiting for unselected layers', async () => {
        const target = fixture();
        const pending = waitForViewportReady(target.display, [target.first.target, target.first.target]);
        target.emit('mapviewchangeend');
        target.first.ready();
        await vi.advanceTimersByTimeAsync(10);
        expect(await pending).toBe(target.display);
        expect(target.first.target.addEventListener).toHaveBeenCalledTimes(1);
        expect(target.second.target.addEventListener).not.toHaveBeenCalled();
        expectCleanedUp(target);
    });

    it('reports the current pending layers on timeout and releases every subscription', async () => {
        const target = fixture();
        const pending = waitForViewportReady(target.display).then(() => null, (error: Error) => error);
        target.first.ready();
        target.emit('mapviewchangeend');
        await vi.advanceTimersByTimeAsync(10000);
        const error = await pending;
        expect(error.message).toContain('actionDone=true');
        expect(error.message).toContain('mapviewchangeend=true');
        expect(error.message).toContain('pendingLayers=["second"]');
        expectCleanedUp(target);
    });

    for (const asynchronous of [false, true]) {
        it(`cleans up after ${asynchronous ? 'asynchronous' : 'synchronous'} action failure`, async () => {
            const target = fixture();
            const error = new Error('viewport action failed');
            const pending = waitForViewportReady(target.display, () => {
                if (asynchronous) return Promise.reject(error);
                throw error;
            });
            await expect(pending).rejects.toBe(error);
            expectCleanedUp(target);
        });
    }

    for (const subscription of ['map', 'layer']) {
        it(`cleans up partial ${subscription} registration without running the action`, async () => {
            const target = fixture();
            const error = new Error('viewport subscription failed');
            const action = vi.fn();
            if (subscription === 'map') {
                const add = target.display.addEventListener.getMockImplementation();
                target.display.addEventListener.mockImplementationOnce((type, listener) => {
                    add(type, listener);
                    throw error;
                });
            } else {
                const add = target.first.target.addEventListener.getMockImplementation();
                target.first.target.addEventListener.mockImplementationOnce((type, listener) => {
                    add(type, listener);
                    throw error;
                });
            }
            await expect(waitForViewportReady(target.display, action)).rejects.toBe(error);
            expect(action).not.toHaveBeenCalled();
            expectCleanedUp(target);
        });
    }

    it('reports cleanup failure while still removing the remaining subscriptions', async () => {
        const target = fixture();
        const error = new Error('viewport unsubscribe failed');
        const remove = target.first.target.removeEventListener.getMockImplementation();
        target.first.target.removeEventListener.mockImplementationOnce((type, listener) => {
            remove(type, listener);
            throw error;
        });
        const pending = waitForViewportReady(target.display).then(() => null, (reason: Error) => reason);
        target.emit('mapviewchangeend');
        target.first.ready();
        target.second.ready();
        await vi.advanceTimersByTimeAsync(10);
        expect(await pending).toBe(error);
        expectCleanedUp(target);
    });

    it('consumes action failure after a timeout without resubscribing or leaking timers', async () => {
        const target = fixture();
        let rejectAction: (reason: Error) => void;
        const pending = waitForViewportReady(target.display, () => new Promise<void>((resolve, reject) => {
            rejectAction = reject;
        })).then(() => null, (error: Error) => error);
        await vi.advanceTimersByTimeAsync(10000);
        expect((await pending).message).toContain('actionDone=false');
        rejectAction(new Error('late viewport action failure'));
        await vi.advanceTimersByTimeAsync(0);
        expectCleanedUp(target);
    });
});
