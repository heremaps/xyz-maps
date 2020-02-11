/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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

import {testUtils} from './testUtils';
import {features, Editor} from '@here/xyz-maps-editor';

export namespace editorTests {
    export async function click(editor: Editor, x: number, y: number): Promise<MouseEvent|void> {
        return new Promise(async (resolve) => {
            var mapContainer = editor.container;
            var eventHandler = function(e: MouseEvent) {
                editor.removeEventListener('pointerup', eventHandler);
                resolve(e);
            };

            editor.addEventListener('pointerup', eventHandler);

            await testUtils.events.click(mapContainer, x, y);

            editor.removeEventListener('pointerup', eventHandler);
            resolve();
        });
    }

    export function submit(editor: Editor): Promise<{permanentIDMap: any}> {
        return new Promise((resolve, reject) => {
            editor.submit({
                onSuccess: resolve,
                onError: reject
            });
        });
    }

    export function waitForEditorReady(editor: Editor, fn?:Function): Promise<Editor> {
        let elem = editor.container;

        return new Promise(async (resolve, reject) => {
            let buttonup = true;
            let mapviewready = true;
            let readyCb = (ob: string, newValue: boolean) => {
                if (newValue) {
                    editor.removeObserver('ready', readyCb);
                    editor.removeEventListener('error', errorCb);
                    mapviewready = true;

                    if (buttonup) {
                        elem.removeEventListener('mousedown', mousedowncb);
                        elem.removeEventListener('mouseup', mouseupcb);
                        resolve(editor);
                    }
                } else {
                    mapviewready = false;
                }
            };


            let errorCb = (err: Error) => {
                editor.removeObserver('ready', readyCb);
                editor.removeEventListener('error', errorCb);

                reject(err);
            };


            let mouseupcb = (evt) => {
                buttonup = true;

                if (mapviewready) {
                    elem.removeEventListener('mouseup', mouseupcb);
                    resolve(editor);
                }
            };

            let mousedowncb = (evt) => {
                mapviewready = false;
                buttonup = false;
                elem.addEventListener('mouseup', mouseupcb);
                elem.removeEventListener('mousedown', mousedowncb);
            };

            elem.addEventListener('mousedown', mousedowncb);

            editor.addObserver('ready', readyCb);
            editor.addEventListener('error', errorCb);

            if (fn) {
                await fn();
            }
        });
    }

    export async function clean(editor: Editor, idMapStack) {
        if (editor.get('history.length') !=0) {
            await waitForEditorReady(editor, ()=>{
                editor.revert();
            });
        }

        let layers = editor.getLayers();
        for (var i in idMapStack) {
            let idMaps = idMapStack[i];
            for (var j in idMaps['permanentIDMap']) {
                let idMap = idMaps['permanentIDMap'][j];
                var provider = j;

                for (var l in layers) {
                    if (layers[l].getProvider().id == provider) {
                        provider = layers[l];
                        break;
                    }
                }

                for (var k in idMap) {
                    let o = editor.getFeature(idMap[k], provider);
                    if (o) o.remove();
                }
            }
        }

        await waitForEditorReady(editor, async ()=>{
            await submit(editor);
        });
    }
}
