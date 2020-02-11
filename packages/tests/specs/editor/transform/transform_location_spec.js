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
import dataset from './transform_location_spec.json';

describe('transform for poi and point address', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let poi;
    let address;
    let container;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.03547451898947, latitude: 13.709170873282702},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        poi = preparedData.getFeature('placeLayer', '-29538');
        address = preparedData.getFeature('paLayer', '-48036');

        container = editor.createFeatureContainer();
        container.push(poi, address);

        expect(poi.coord(), [76.035206298, 13.709301163, 0]);
        expect(address.coord(), [76.035072188, 13.709170873, 0]);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('get container and transform right boarder', async function() {
        container.transform();

        await testUtils.events.drag(mapContainer, {x: 313, y: 250}, {x: 330, y: 250});

        expect(poi.coord(), [76.035246764, 13.709301163, 0]);
        expect(address.coord(), [76.035072188, 13.709170873, 0]);
    });

    it('get container and transform left boarder', async function() {
        container.transform();

        await testUtils.events.drag(mapContainer, {x: 235, y: 250}, {x: 210, y: 250});

        expect(poi.coord(), [76.035246764, 13.709301163, 0]);
        expect(address.coord(), [76.035004899, 13.709170873, 0]);
    });


    it('get container and transform top boarder', async function() {
        container.transform();

        await testUtils.events.drag(mapContainer, {x: 270, y: 233}, {x: 270, y: 200});

        expect(poi.coord(), [76.035246764, 13.709391453, 0]);
        expect(address.coord(), [76.035004899, 13.709170873, 0]);
    });

    it('get container and transform bottom boarder', async function() {
        container.transform();

        await testUtils.events.drag(mapContainer, {x: 270, y: 315}, {x: 270, y: 280});

        expect(poi.coord(), [76.035246764, 13.709391453, 0]);
        expect(address.coord(), [76.035004899, 13.709262989, 0]);
    });

    it('get container and move transformer', async function() {
        container.transform();

        await testUtils.events.drag(mapContainer, {x: 270, y: 240}, {x: 300, y: 280});

        expect(poi.coord(), [76.03532723, 13.709287221, 0]);
        expect(address.coord(), [76.035085365, 13.709158757, 0]);
    });

    it('get container and rotate transformer', async function() {
        container.transform();

        await testUtils.events.drag(mapContainer, {x: 360, y: 320}, {x: 300, y: 330});

        expect(poi.coord(), [76.03532839, 13.709160863, 0]);
        expect(address.coord(), [76.035084205, 13.709285115, 0]);
    });

    xit('get container and rotate transformer', async function() {
        container.transform();

        await testUtils.events.drag(mapContainer, {x: 330, y: 270}, {x: 340, y: 300});

        expect(poi.coord(), [76.03532839, 13.709160863, 0]);
        expect(address.coord(), [76.035084205, 13.709285115, 0]);
    });
});
