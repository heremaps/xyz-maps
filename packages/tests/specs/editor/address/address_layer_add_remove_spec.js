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
import {editorTests, displayTests, prepare, testUtils} from 'hereTest';
import {Editor} from '@here/xyz-maps-editor';
import {Map} from '@here/xyz-maps-core';
import dataset from './address_layer_add_remove_spec.json';

describe('Address layer add and remove', function() {
    const expect = chai.expect;

    let preparedData;
    let editor;
    let display;
    let mapContainer;
    let addrLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: -92.87121, latitude: 40.593582},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        addrLayer = preparedData.getLayers('paLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('validate map objects in viewport', function() {
        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs.length).to.equal(4);
    });

    it('remove address layer and validate', function() {
        editor.removeLayer(addrLayer);

        let objs = editor.search({rect: display.getViewBounds()});

        expect(objs.length).to.equal(3);
        expect(editor.getLayers().length).to.equal(3);
    });

    it('click n drag on an address, validate map is dragged', async function() {
        // click on an address
        await testUtils.events.click(mapContainer, 100, 200);

        // drag on Address
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 100, y: 200}, {x: 154, y: 237});
        });

        let nc = display.getCenter();
        expect(nc).to.not.deep.equal({longitude: -92.87121, latitude: 40.593582});
    });

    it('add address layer and validate', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: -92.87121, latitude: 40.593582});
        });

        editor.addLayer(addrLayer);

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs.length).to.equal(4);
    });

    it('click n drag on an address, validate map is not dragged', async function() {
        // click on an address
        await testUtils.events.click(mapContainer, 100, 200);

        // drag on Address
        await testUtils.events.drag(mapContainer, {x: 100, y: 200}, {x: 154, y: 237});

        let nc = display.getCenter();
        expect(nc).to.deep.equal({longitude: -92.87121, latitude: 40.593582});

        // click on ground
        await testUtils.events.click(mapContainer, 300, 200);
    });
});
