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
import {editorTests, prepare, testUtils} from 'hereTest';
import {Editor} from '@here/xyz-maps-editor';
import {Map} from '@here/xyz-maps-core';
import chaiAlmost from 'chai-almost';
import dataset from './address_setcoordinates_spec.json';

describe('add Address layer set coordinates', function() {
    const expect = chai.expect;

    var preparedData;
    let editor;
    let display;
    let mapContainer;
    let link;
    let address;
    let addrLayer;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.573482, latitude: 12.950542},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await editorTests.waitForEditorReady(editor);

        link = preparedData.getFeature('linkLayer', -188828);
        address = preparedData.getFeature('paLayer', -47939);

        addrLayer = preparedData.getLayers('paLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('verify address has correct geo coordinate then modify its geo coordinate', function() {
        expect(address.coord()).to.deep.equal([
            75.572408633, 12.951587932, 0
        ]);

        address.coord([75.57348151653287, 12.95054234105065, 0]);
    });


    it('verify address has correct geo coordinate', function() {
        expect(address.coord()).to.deep.equal([
            75.57348151653287, 12.95054234105065, 0
        ]);
    });

    it('modify and verify address has correct geo coordinate', function() {
        address.coord([75.57240863292691, 12.9515879324657, 0]);

        expect(address.coord()).to.deep.equal([
            75.57240863292691, 12.9515879324657, 0
        ]);
    });


    it('validate objects in viewport', function() {
        let objs1 = editor.search({rect: display.getViewBounds(), layers: [addrLayer]});
        let objs2 = editor.search({rect: display.getViewBounds()});

        expect(objs1).to.have.lengthOf(1);
        expect(objs2).to.have.lengthOf(2);
    });

    it('drag the address, remove the address layer and validate modified address in viewport', async function() {
        let mapContainer = display.getContainer();
        await testUtils.events.click(mapContainer, 200, 100);
        await testUtils.events.drag(mapContainer, {x: 200, y: 100}, {x: 200, y: 150});

        editor.removeLayer(addrLayer);

        let objs1 = editor.search({rect: display.getViewBounds(), layers: [addrLayer]});
        let objs2 = editor.search({rect: display.getViewBounds()});

        expect(objs1).to.have.lengthOf(1);
        expect(objs2).to.have.lengthOf(1);
    });

    it('add Address layer, verify address has correct geo coordinate', async function() {
        editor.addLayer(addrLayer);

        expect(address.coord()).to.deep.almost([
            75.572408633, 12.951326536, 0
        ]);
    });
});
