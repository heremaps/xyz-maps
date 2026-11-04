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
import {Editor} from '@here/xyz-maps-editor';
import {onTestFinished} from 'vitest';
import {waitForEditorReady} from '../synchronization/editor';
import {createMapFixture, type MapFixtureOptions} from './map';

/** Creates an editor with fresh data and readiness; disposes Editor before Map and data. */
export async function createEditorFixture(
    dataset: Parameters<typeof createMapFixture>[0],
    mapOptions: MapFixtureOptions,
    editorOptions: Omit<ConstructorParameters<typeof Editor>[1], 'layers'> = {}
) {
    const {preparedData, display} = await createMapFixture(dataset, mapOptions);
    let editor: Editor;
    onTestFinished(() => {
        if (editor?.destroy) editor.destroy();
    });
    editor = new Editor(display, {...editorOptions, layers: preparedData.getLayers()});
    await waitForEditorReady(editor);
    return {preparedData, display, editor};
}
