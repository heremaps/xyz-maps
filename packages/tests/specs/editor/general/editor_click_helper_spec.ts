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
import type {EditorEvent} from '@here/xyz-maps-editor';
import {editorClick} from 'editorUtils';
import {click} from 'triggerEvents';
import {userEvent} from 'vitest/browser';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

describe('editor click helper', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:0;top:0;width:30px;height:30px;z-index:99999';
        document.body.appendChild(container);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        container.remove();
    });

    function fixture(emitPointerUp = true) {
        const listeners = new Set<(event: EditorEvent) => void>();
        const event: EditorEvent = {type: 'pointerup', timeStamp: 0, button: 0, detail: {}, mapX: 10, mapY: 10};
        const editor = {
            container,
            addEventListener: vi.fn((type: 'pointerup', listener: (event: EditorEvent) => void) => {
                listeners.add(listener);
            }),
            removeEventListener: vi.fn((type: 'pointerup', listener: (event: EditorEvent) => void) => {
                listeners.delete(listener);
            })
        };
        function emit() {
            if (emitPointerUp) listeners.forEach((listener) => listener(event));
        }
        const nativeClick = vi.spyOn(userEvent, 'click').mockImplementation(() => {
            expect(listeners.size).toBe(1);
            emit();
            return Promise.resolve();
        });
        return {editor, event, listeners, emit, nativeClick};
    }

    function expectCleanedUp(target: ReturnType<typeof fixture>) {
        expect(target.listeners.size).toBe(0);
        expect(target.editor.removeEventListener).toHaveBeenCalledTimes(1);
        expect(target.editor.removeEventListener).toHaveBeenCalledWith(
            'pointerup', target.editor.addEventListener.mock.calls[0][1]
        );
        expect(vi.getTimerCount()).toBe(0);
    }

    it('registers before clicking and returns the original editor event', async () => {
        const target = fixture();
        expect(await editorClick(target.editor, 10, 10)).toBe(target.event);
        expect(target.nativeClick).toHaveBeenCalledExactlyOnceWith(container, {
            position: {x: 10, y: 10},
            modifiers: ['Alt'],
            timeout: 2000
        });
        expectCleanedUp(target);
    });

    it('waits for click completion even if pointerup arrived first', async () => {
        const target = fixture();
        let completed = false;
        target.nativeClick.mockImplementationOnce(() => {
            target.emit();
            return new Promise<void>((resolve) => setTimeout(resolve, 100));
        });
        const pending = editorClick(target.editor, 10, 10).then((event) => {
            completed = true;
            return event;
        });
        await vi.advanceTimersByTimeAsync(99);
        expect(completed).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(await pending).toBe(target.event);
        expectCleanedUp(target);
    });

    it('reports missing pointerup at the deadline and cleans up', async () => {
        const target = fixture(false);
        let completed = false;
        const pending = editorClick(target.editor, 10, 10).then(() => null, (error: Error) => {
            completed = true;
            return error;
        });
        await vi.advanceTimersByTimeAsync(1999);
        expect(completed).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect((await pending)?.message).toBe('Timed out waiting for editor click: pointerup=false, click=true');
        expectCleanedUp(target);
    });

    it('times out an unfinished native click even after pointerup', async () => {
        const target = fixture();
        target.nativeClick.mockImplementationOnce(() => {
            target.emit();
            return new Promise<void>(() => {});
        });
        const pending = editorClick(target.editor, 10, 10).then(() => null, (error: Error) => error);
        await vi.advanceTimersByTimeAsync(2000);
        expect((await pending)?.message).toBe('Timed out waiting for editor click: pointerup=true, click=false');
        expectCleanedUp(target);
    });

    for (const ready of [false, true]) {
        it(`propagates native click failures ${ready ? 'after' : 'before'} pointerup and cleans up`, async () => {
            const target = fixture();
            const error = new Error('native click failed');
            target.nativeClick.mockImplementationOnce(() => {
                if (ready) target.emit();
                return Promise.reject(error);
            });
            await expect(editorClick(target.editor, 10, 10)).rejects.toBe(error);
            expectCleanedUp(target);
        });
    }

    it('propagates registration failures without starting the click', async () => {
        const target = fixture();
        const error = new Error('pointerup registration failed');
        target.editor.addEventListener.mockImplementationOnce(() => {
            throw error;
        });
        await expect(editorClick(target.editor, 10, 10)).rejects.toBe(error);
        expect(target.nativeClick).not.toHaveBeenCalled();
        expect(target.listeners.size).toBe(0);
        expect(target.editor.removeEventListener).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('rejects an already-aborted click without dispatching events', async () => {
        const controller = new AbortController();
        const error = new Error('click cancelled');
        controller.abort(error);
        const dispatched = vi.spyOn(container, 'dispatchEvent');
        await expect(click(container, 10, 10, 0, controller.signal)).rejects.toBe(error);
        expect(dispatched).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('propagates cancellation of a pending synthetic click and removes its listener', async () => {
        const controller = new AbortController();
        const error = new Error('pending click cancelled');
        const remove = vi.spyOn(container, 'removeEventListener');
        container.addEventListener('click', (event) => event.stopImmediatePropagation(), {capture: true});
        const pending = click(container, 10, 10, 0, controller.signal);
        controller.abort(error);
        await expect(pending).rejects.toBe(error);
        expect(remove.mock.calls.filter(([type]) => type === 'click')).toHaveLength(1);
        expect(vi.getTimerCount()).toBe(0);
    });
});
