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
