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

import {displayTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import dataset from './pointer_down_up_listener_spec.json';

describe('pointer down and pointer up listener', function() {
    const expect = chai.expect;

    let preparedData;
    let display;
    let mapContainer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.02278439898076, latitude: 20.273712610318146},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });

        await displayTests.waitForViewportReady(display);
        mapContainer = display.getContainer();
    });

    after(async function() {
        display.destroy();
        await preparedData.clear();
    });

    it('validate pointer down and up events on link', async function() {
        let listener = new testUtils.Listener(display, ['pointerdown', 'pointerup']);

        await testUtils.events.click(mapContainer, 554, 243);

        let results = listener.stop();

        expect(results.pointerdown).to.have.lengthOf(1);
        expect(results.pointerdown[0]).to.deep.include({
            button: 0,
            mapX: 554,
            mapY: 243,
            type: 'pointerdown'
        });
        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 554,
            mapY: 243,
            type: 'pointerup'
        });
        expect(results.pointerup[0].target.geometry).to.deep.include({
            type: 'LineString'
        });
    });

    it('validate pointer down and up events on poi', async function() {
        let listener = new testUtils.Listener(display, ['pointerdown', 'pointerup']);

        await testUtils.events.click(mapContainer, 616, 240);

        let results = listener.stop();

        expect(results.pointerdown).to.have.lengthOf(1);
        expect(results.pointerdown[0]).to.deep.include({
            button: 0,
            mapX: 616,
            mapY: 240,
            type: 'pointerdown'
        });
        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 616,
            mapY: 240,
            type: 'pointerup'
        });
        expect(results.pointerup[0].target.geometry).to.deep.include({
            type: 'Point'
        });
    });


    it('validate pointer down and up events on the ground', async function() {
        let listener = new testUtils.Listener(display, ['pointerdown', 'pointerup']);

        await testUtils.events.click(mapContainer, 253, 204);

        let results = listener.stop();

        expect(results.pointerdown).to.have.lengthOf(1);
        expect(results.pointerup).to.have.lengthOf(1);
    });
});
