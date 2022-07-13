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

import {click} from './triggerEvents';
import {Editor, EditorEvent} from '@here/xyz-maps-editor';

export async function editorClick(editor: Editor, x: number, y: number): Promise<EditorEvent> {
    return new Promise((resolve) => {
        const onPointerUp = (e: EditorEvent) => {
            editor.removeEventListener('pointerup', onPointerUp);
            resolve(e);
        };
        editor.addEventListener('pointerup', onPointerUp);

        click(editor.container, x, y);
    });
}

export function submit(editor: Editor): Promise<{ permanentIDMap: any }> {
    return new Promise((resolve, reject) => {
        editor.submit({
            onSuccess: resolve,
            onError: reject
        });
    });
}

type AsyncFunction = () => Promise<void>;

export function waitForEditorReady(editor: Editor, fn?: Function | AsyncFunction): Promise<Editor> {
    return new Promise(async (resolve, reject) => {
        let functionDone = false;
        let readyCb = (ob: string, newValue: boolean) => {
            if (newValue && functionDone) {
                editor.removeObserver('ready', readyCb);
                editor.removeEventListener('error', errorCb);

                resolve(editor);
            }
        };

        let errorCb = (err: Error) => {
            editor.removeObserver('ready', readyCb);
            editor.removeEventListener('error', errorCb);

            reject(err);
        };

        editor.addObserver('ready', readyCb);
        editor.addEventListener('error', errorCb);

        if (fn) {
            await fn();
        }
        functionDone = true;
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
