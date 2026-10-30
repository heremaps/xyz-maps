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

import {userEvent} from 'vitest/browser';
import {Editor, EditorEvent} from '@here/xyz-maps-editor';
import {expect} from 'vitest';

interface EditorClickTarget extends Pick<Editor, 'container'> {
    addEventListener(type: 'pointerup', listener: (event: EditorEvent) => void): void;
    removeEventListener(type: 'pointerup', listener: (event: EditorEvent) => void): void;
}

/** Waits for both the native browser click and editor pointerup, with a two-second deadline and listener cleanup. */
export async function editorClick(editor: EditorClickTarget, x: number, y: number): Promise<EditorEvent> {
    const timeoutError = new Error('Timed out waiting for editor click');
    let timer: ReturnType<typeof setTimeout>;
    let pointerUpDone = false;
    let clickDone = false;
    let onPointerUp: (event: EditorEvent) => void;
    const pointerUp = new Promise<EditorEvent>((resolve) => {
        onPointerUp = (event) => {
            pointerUpDone = true;
            resolve(event);
        };
    });
    const timeout = new Promise<never>((resolve, reject) => {
        timer = setTimeout(() => {
            timeoutError.message += `: pointerup=${pointerUpDone}, click=${clickDone}`;
            reject(timeoutError);
        }, 2000);
    });
    try {
        editor.addEventListener('pointerup', onPointerUp);
        const nativeClick = userEvent.click(editor.container, {
            position: {x, y},
            modifiers: ['Alt'],
            timeout: 2000
        }).then(() => {
            clickDone = true;
        });
        const [event] = await Promise.race([Promise.all([pointerUp, nativeClick]), timeout]);
        return event;
    } finally {
        clearTimeout(timer);
        editor.removeEventListener('pointerup', onPointerUp);
    }
}

export function submit(editor: Editor): Promise<{ permanentIDMap: any }> {
    return new Promise((resolve, reject) => {
        editor.submit({
            onSuccess: resolve,
            onError: reject
        });
    });
}

interface EditorReadyTarget extends Pick<Editor, 'addObserver' | 'removeObserver'> {
    addEventListener(type: 'error', listener: (error: Error) => void): void;
    removeEventListener(type: 'error', listener: (error: Error) => void): void;
}

/**
 * Waits for the action to complete and a fresh ready signal, including signals received during the action.
 * A later busy signal invalidates earlier readiness. Missing readiness or an unfinished action fails after ten seconds.
 */
export function waitForEditorReady<T extends EditorReadyTarget>(editor: T, fn?: () => unknown): Promise<T> {
    return new Promise((resolve, reject) => {
        let actionDone = !fn;
        let ready: boolean | undefined;
        let settled = false;
        const timeoutError = new Error('Timed out waiting for editor readiness');

        function cleanup() {
            clearTimeout(timeout);
            try {
                editor.removeObserver('ready', readyCb);
            } finally {
                editor.removeEventListener('error', errorCb);
            }
        }

        function settle(finish: () => void) {
            if (settled) return;
            settled = true;
            try {
                cleanup();
            } catch (error) {
                reject(error);
                return;
            }
            finish();
        }

        function complete() {
            if (actionDone && ready === true) {
                settle(() => resolve(editor));
            }
        }

        function fail(error: unknown) {
            settle(() => reject(error));
        }

        function readyCb(ob: string, newValue: boolean) {
            ready = newValue;
            complete();
        }

        function errorCb(error: Error) {
            fail(error);
        }

        const timeout = setTimeout(() => {
            timeoutError.message += `: actionDone=${actionDone}, ready=${ready}`;
            fail(timeoutError);
        }, 10000);

        try {
            editor.addObserver('ready', readyCb);
            editor.addEventListener('error', errorCb);
            Promise.resolve(fn?.()).then(() => {
                actionDone = true;
                complete();
            }).catch(fail);
        } catch (error) {
            fail(error);
        }
    });
}

const getProviderById = (provId: string, editor: Editor) => {
    const layers = editor.getLayers();
    let provider;
    for (let l in layers) {
        if (layers[l].getProvider().id == provId) {
            provider = layers[l];
            break;
        }
    }
    return provider;
};

export async function clean(editor: Editor, idMapStack) {
    if (editor.get('history.length') != 0) {
        await waitForEditorReady(editor, () => {
            editor.revert();
        });
    }

    for (let i in idMapStack) {
        let idMaps = idMapStack[i];
        for (let id in idMaps['permanentIDMap']) {
            const idMap = idMaps['permanentIDMap'][id];
            const provider = getProviderById(id, editor) || id;

            for (let k in idMap) {
                editor.getFeature(idMap[k], provider)?.remove();
            }
        }
    }

    await waitForEditorReady(editor, async () => {
        await submit(editor);
    });
}

export function validateSegment(segment, expectedSegment, linkId?: string | number) {
    expect({
        from: segment.from,
        to: segment.to,
        reversed: segment.reversed
    }).toEqualWithTolerance(expectedSegment, 1e-5);

    if (linkId !== undefined) {
        expect(segment.feature).toEqual(expect.objectContaining({id: linkId}));
    }
}
