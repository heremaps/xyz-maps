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
import {Editor, features} from '@here/xyz-maps-editor';
import dataset from './address_click_spec.json';

describe('click on address to validate the coordinate', function() {
    const expect = chai.expect;

    let preparedData;
    let poi;
    let address;

    let editor;
    let display;
    let mapContainer;

    before(async function() {
        preparedData = await prepare(dataset);

        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.284222, latitude: 14.125044},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        mapContainer = display.getContainer();

        poi = preparedData.getFeature('placeLayer', -30154);
        address = preparedData.getFeature('paLayer', -49140);
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('validate address coordinate with click', async function() {
        expect(address.coord()).to.deep.equal([76.283418331, 14.125304508, 0]);

        // click on an address
        await testUtils.events.click(mapContainer, 100, 200);

        // validate address coordinate again
        expect(address.coord()).to.deep.equal([76.283418331, 14.125304508, 0]);

        // valiate object is not modified
        expect(editor.info().length).to.equal(0);
    });

    it('validate poi coordinate with click', async function() {
        expect(poi.coord()).to.deep.equal([76.283954773, 14.125304508, 0]);

        // click on POI
        await testUtils.events.click(mapContainer, 300, 200);

        // validate POI coordinate
        expect(poi.coord()).to.deep.equal([76.283954773, 14.125304508, 0]);

        // valiate object is not modified
        expect(editor.info().length).to.equal(0);
    });

    it('add address object and validate its coord', async function() {
        // add address object
        let a = new features.Address({x: 200, y: 200}, {featureClass: 'ADDRESS'});
        let address = editor.addFeature(a);

        // click on an address
        await testUtils.events.click(mapContainer, 200, 200);

        // validate address coordinate
        expect(address.coord()).to.deep.equal([76.283685558, 14.125304111, 0]);

        // click on ground
        await testUtils.events.click(mapContainer, 300, 200);
    });
});
