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
import {editorTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './map_observer_ready_addlayer_spec.json';

describe('map ready observer for addlayer', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.02831, latitude: 12.9356},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display);

        // validate ready event
        let observer = new testUtils.Observer(editor, 'ready');
        await editorTests.waitForEditorReady(editor);

        let results = observer.stop();
        expect(results['ready']).to.deep.equal([true]);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
    });

    it('observe ready with addlayer', async function() {
        let layers = editor.getLayers();

        expect(layers).to.be.lengthOf(0);

        let observer = new testUtils.Observer(editor, 'ready');


        await editorTests.waitForEditorReady(editor, ()=>{
            // add a layer to editor
            editor.addLayer(preparedData.getLayers()[0]);
        });

        let results = observer.stop();
        expect(results['ready']).to.deep.equal([false, true]);

        layers = editor.getLayers();

        expect(layers).to.be.lengthOf(1);
    });
});
