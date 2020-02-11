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
import {editorTests, displayTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './poi_layer_add_remove_spec.json';

describe('POI layer add and remove', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let poiLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.54966, latitude: 14.02363},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        poiLayer = preparedData.getLayers('placeLayer');

        let objects = editor.search({rect: display.getViewBounds()});
        expect(objects).to.have.lengthOf(3);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('remove poi layer, and validate it is removed', function() {
        editor.removeLayer(poiLayer);

        let objs = editor.search({rect: display.getViewBounds()});

        expect(objs).to.have.lengthOf(2);
        expect(editor.getLayers()).to.have.lengthOf(2);
    });

    it('try dragging the poi and validate the map is dragged', async function() {
        await testUtils.events.click(mapContainer, 200, 250);
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 200, y: 250}, {x: 250, y: 280});
        });

        expect(display.getCenter().longitude).to.not.equal(75.54966);
    });

    it('add poi layer, and validate it is added', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 75.54966, latitude: 14.02363});
        });

        editor.addLayer(poiLayer);

        let objs = editor.search(display.getViewBounds());

        expect(objs).to.have.lengthOf(3);
        expect(editor.getLayers()).to.have.lengthOf(3);
    });

    it('try dragging the poi and validate the map is not dragged', async function() {
        await testUtils.events.click(mapContainer, 200, 250);
        await testUtils.events.drag(mapContainer, {x: 200, y: 250}, {x: 200, y: 260});

        expect(display.getCenter()).to.deep.equal({longitude: 75.54966, latitude: 14.02363});
    });
});
