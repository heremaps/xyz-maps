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
import {Observer} from '@test/observers/recorders';
import {waitForEditorReady} from '@test/synchronization/editor';
import {createMapFixture} from '@test/fixtures/map';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './editor-readiness-layer-addition.json';
import {describe, it, expect, onTestFinished} from 'vitest';

describe('Editor readiness during initialization and layer addition', function() {
    it('emits readiness during initialization and layer addition', async function() {
        const {preparedData, display} = await createMapFixture(dataset, {
            center: {longitude: 77.02831, latitude: 12.9356},
            zoomlevel: 18
        });
        let editor: Editor;
        onTestFinished(() => {
            if (editor?.destroy) editor.destroy();
        });
        editor = new Editor(display);

        {
            let observer = new Observer(editor, 'ready');
            await waitForEditorReady(editor);
            let results = observer.stop();
            expect(results['ready']).toStrictEqual([true]);
        }
        let layers = editor.getLayers();

        expect(layers).toHaveLength(0);

        let observer = new Observer(editor, 'ready');


        await waitForEditorReady(editor, ()=>{
            // add a layer to editor
            editor.addLayer(preparedData.getLayers()[0]);
        });

        let results = observer.stop();
        expect(results['ready']).toStrictEqual([false, true]);

        layers = editor.getLayers();

        expect(layers).toHaveLength(1);
    });
});
