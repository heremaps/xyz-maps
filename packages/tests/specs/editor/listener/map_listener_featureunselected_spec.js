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
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './map_listener_featureunselected_spec.json';

describe('map featureunselected event listener', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.34850525592807, latitude: 11.87855804209614},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('drag link shape point to remove and validate drag and featureUnselected events', async function() {
        let listener = new testUtils.Listener(editor, ['dragStart', 'dragStop', 'featureUnselected']);

        // click on link
        await testUtils.events.click(mapContainer, 150, 200);

        // drag link shape point
        await testUtils.events.drag(mapContainer, {x: 300, y: 200}, {x: 300, y: 210});

        // drag link shape point to remove
        await testUtils.events.drag(mapContainer, {x: 300, y: 210}, {x: 100, y: 200});

        let results = listener.stop();

        expect(results.featureUnselected).to.have.lengthOf(1);

        expect(results.dragStart).to.have.lengthOf(2);
        expect(results.dragStart[0]).to.deep.include({
            button: 0,
            type: 'dragStart'
        });
        expect(results.dragStop).to.have.lengthOf(2);
        expect(results.dragStop[0]).to.deep.include({
            button: 0,
            mapX: 300,
            mapY: 210,
            type: 'dragStop'
        });
        expect(results.dragStop[1]).to.deep.include({
            button: 0,
            mapX: 100,
            mapY: 200,
            type: 'dragStop'
        });
    });
});
