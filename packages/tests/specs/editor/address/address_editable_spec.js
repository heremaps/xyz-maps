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
import chaiAlmost from 'chai-almost';
import dataset from './address_editable_spec.json';

describe('address editable', function() {
    const expect = chai.expect;
    let editor;
    let display;

    let preparedData;
    let mapContainer;
    let address;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.537329, latitude: 16.481374},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await editorTests.waitForEditorReady(editor);

        mapContainer = display.getContainer();

        address = preparedData.getFeature('paLayer', -47934);
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });


    it('get point address object and validate the point address object coordinates', function() {
        expect(address.coord()).to.deep.equal([80.535719317, 16.481374142, 0]);
    });

    it('drag the point address, validate the address is not dragged', async function() {
        address.editable(false);

        await testUtils.events.click(mapContainer, 100, 300);
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 100, y: 300}, {x: 324, y: 303});
        });

        expect(address.coord()).to.deep.equal([80.535719317, 16.481374142, 0]);
    });

    it('move the map back and set the address editable then drag the address', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 80.53732864215854, latitude: 16.481374141548827});
        });

        // set the address editable
        address.editable(true);

        await testUtils.events.click(mapContainer, 100, 300);
        await testUtils.events.drag(mapContainer, {x: 100, y: 300}, {x: 324, y: 303});

        expect(address.coord()).to.deep.almost([80.536920945, 16.48135871, 0]);

        // click to unselect address
        await testUtils.events.click(mapContainer, 200, 300);
    });
});
