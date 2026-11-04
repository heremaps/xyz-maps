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
import type {Editor} from '@here/xyz-maps-editor';
import {waitForEditorReady} from '@test/synchronization/editor';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

describe('editor readiness helper', () => {
    function fixture() {
        const observers = new Set<Parameters<Editor['addObserver']>[1]>();
        const errors = new Set<(error: Error) => void>();
        const editor = {
            addObserver: vi.fn<Editor['addObserver']>((name, observer) => {
                observers.add(observer);
            }),
            removeObserver: vi.fn<Editor['removeObserver']>((name, observer) => {
                observers.delete(observer);
            }),
            addEventListener: vi.fn<Editor['addEventListener']>((type, listener) => {
                errors.add(listener);
            }),
            removeEventListener: vi.fn<Editor['removeEventListener']>((type, listener) => {
                errors.delete(listener);
            })
        };
        return {
            editor,
            observers,
            errors,
            ready(value: boolean) {
                observers.forEach((observer) => observer('ready', value, !value));
            },
            error(error: Error) {
                errors.forEach((listener) => listener(error));
            }
        };
    }

    function expectCleanedUp(target: ReturnType<typeof fixture>) {
        expect(target.observers.size).toBe(0);
        expect(target.errors.size).toBe(0);
        expect(target.editor.removeObserver).toHaveBeenCalledTimes(1);
        expect(target.editor.removeObserver).toHaveBeenCalledWith('ready', target.editor.addObserver.mock.calls[0][1]);
        expect(target.editor.removeEventListener).toHaveBeenCalledTimes(1);
        expect(target.editor.removeEventListener).toHaveBeenCalledWith('error', target.editor.addEventListener.mock.calls[0][1]);
        expect(vi.getTimerCount()).toBe(0);
    }

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('registers before the action and accepts synchronous readiness during the action', async () => {
        const target = fixture();
        let started = false;
        const pending = waitForEditorReady(target.editor, () => {
            started = true;
            expect(target.observers.size).toBe(1);
            expect(target.errors.size).toBe(1);
            target.ready(true);
        });
        expect(started).toBe(true);
        expect(await pending).toBe(target.editor);
        expectCleanedUp(target);
    });

    it('waits for a fresh ready event without an action', async () => {
        const target = fixture();
        const pending = waitForEditorReady(target.editor);
        target.ready(false);
        expect(target.observers.size).toBe(1);
        target.ready(true);
        expect(await pending).toBe(target.editor);
        expectCleanedUp(target);
    });

    it('waits for the asynchronous action even if readiness arrived earlier', async () => {
        const target = fixture();
        let completed = false;
        const pending = waitForEditorReady(target.editor, async () => {
            target.ready(true);
            await new Promise<void>((resolve) => setTimeout(resolve, 100));
        }).then(() => {
            completed = true;
        });
        await vi.advanceTimersByTimeAsync(99);
        expect(completed).toBe(false);
        expect(target.observers.size).toBe(1);
        await vi.advanceTimersByTimeAsync(1);
        await pending;
        expect(completed).toBe(true);
        expectCleanedUp(target);
    });

    it('does not use stale readiness if the editor becomes busy before the action completes', async () => {
        const target = fixture();
        let completed = false;
        const pending = waitForEditorReady(target.editor, () => {
            target.ready(true);
            target.ready(false);
        }).then(() => {
            completed = true;
        });
        await vi.advanceTimersByTimeAsync(0);
        expect(completed).toBe(false);
        target.ready(true);
        await pending;
        expect(completed).toBe(true);
        expectCleanedUp(target);
    });

    for (const asynchronous of [false, true]) {
        it(`propagates ${asynchronous ? 'asynchronous' : 'synchronous'} action errors even after readiness`, async () => {
            const target = fixture();
            const error = new Error('editor action failed');
            const pending = waitForEditorReady(target.editor, () => {
                target.ready(true);
                if (asynchronous) return Promise.reject(error);
                throw error;
            });
            await expect(pending).rejects.toBe(error);
            expectCleanedUp(target);
        });
    }

    it('propagates editor error events and cleans up', async () => {
        const target = fixture();
        const error = new Error('editor error event');
        const pending = waitForEditorReady(target.editor);
        target.error(error);
        await expect(pending).rejects.toBe(error);
        expectCleanedUp(target);
    });

    it('rejects editor errors during a pending action and ignores its later completion', async () => {
        const target = fixture();
        const error = new Error('editor error during action');
        let finishAction: () => void;
        const pending = waitForEditorReady(target.editor, () => new Promise<void>((resolve) => {
            finishAction = resolve;
            target.ready(true);
        }));
        target.error(error);
        await expect(pending).rejects.toBe(error);
        expectCleanedUp(target);
        finishAction();
        await vi.advanceTimersByTimeAsync(0);
        expectCleanedUp(target);
    });

    it('cleans up partial registration if adding the error listener fails', async () => {
        const target = fixture();
        const error = new Error('registration failed');
        const action = vi.fn();
        target.editor.addEventListener.mockImplementationOnce(() => {
            throw error;
        });
        await expect(waitForEditorReady(target.editor, action)).rejects.toBe(error);
        expect(action).not.toHaveBeenCalled();
        expectCleanedUp(target);
    });

    it('reports cleanup failures and still removes the error listener', async () => {
        const target = fixture();
        const error = new Error('observer cleanup failed');
        target.editor.removeObserver.mockImplementationOnce((name, observer) => {
            target.observers.delete(observer);
            throw error;
        });
        const pending = waitForEditorReady(target.editor);
        target.ready(true);
        await expect(pending).rejects.toBe(error);
        expectCleanedUp(target);
    });

    it('reports missing readiness at the deadline instead of hanging', async () => {
        const target = fixture();
        let completed = false;
        const pending = waitForEditorReady(target.editor, () => {}).then(() => null, (error: Error) => {
            completed = true;
            return error;
        });
        await vi.advanceTimersByTimeAsync(9999);
        expect(completed).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect((await pending)?.message).toBe('Timed out waiting for editor readiness: actionDone=true, ready=undefined');
        expectCleanedUp(target);
    });

    it('reports an unfinished action even when the editor signaled readiness', async () => {
        const target = fixture();
        const pending = waitForEditorReady(target.editor, () => {
            target.ready(true);
            return new Promise<void>(() => {});
        }).then(() => null, (error: Error) => error);
        await vi.advanceTimersByTimeAsync(10000);
        expect((await pending)?.message).toBe('Timed out waiting for editor readiness: actionDone=false, ready=true');
        expectCleanedUp(target);
    });

    it('handles a late action rejection after the timeout without settling or cleaning up twice', async () => {
        const target = fixture();
        let rejectAction: (error: Error) => void;
        const pending = waitForEditorReady(target.editor, () => new Promise<void>((resolve, reject) => {
            rejectAction = reject;
        })).then(() => null, (error: Error) => error);
        await vi.advanceTimersByTimeAsync(10000);
        expect((await pending)?.message).toContain('actionDone=false');
        rejectAction(new Error('late action failure'));
        await vi.advanceTimersByTimeAsync(0);
        expectCleanedUp(target);
    });
});
