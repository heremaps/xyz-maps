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

import {displayTests, prepare, testUtils} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import dataset from './pointer_enter_leave_listener_spec.json';

describe('pointer enter and leave feature listener', function() {
    const expect = chai.expect;

    let preparedData;
    let linkLayer;
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
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        display.destroy();
        await preparedData.clear();
    });

    it('validate pointerenter and leave event for hoving POI', async function() {
        await testUtils.events.mousemove(mapContainer, {x: 100, y: 200}, {x: 357, y: 274});

        let listener = new testUtils.Listener(display, ['pointerenter', 'pointerleave']);

        await testUtils.events.mousemove(mapContainer, {x: 357, y: 274}, {x: 376, y: 246});
        await testUtils.events.mousemove(mapContainer, {x: 376, y: 246}, {x: 357, y: 274});

        let results = listener.stop();

        expect(results.pointerenter).to.have.lengthOf(1);
        expect(results.pointerenter[0]).to.deep.include({
            button: 0,
            mapX: 376,
            mapY: 246,
            type: 'pointerenter'
        });
        expect(results.pointerleave).to.have.lengthOf(1);
        expect(results.pointerleave[0]).to.deep.include({
            button: 0,
            mapX: 357,
            mapY: 274,
            type: 'pointerleave'
        });
    });

    it('validate pointerenter and leave event for hoving link', async function() {
        let listener = new testUtils.Listener(display, ['pointerenter', 'pointerleave']);

        await testUtils.events.mousemove(mapContainer, {x: 374, y: 358}, {x: 389, y: 390});
        await testUtils.events.mousemove(mapContainer, {x: 389, y: 390}, {x: 374, y: 358});

        let results = listener.stop();

        expect(results.pointerenter).to.have.lengthOf(1);
        expect(results.pointerenter[0]).to.deep.include({
            button: 0,
            mapX: 389,
            mapY: 390,
            type: 'pointerenter'
        });
        expect(results.pointerleave).to.have.lengthOf(1);
        expect(results.pointerleave[0]).to.deep.include({
            button: 0,
            mapX: 374,
            mapY: 358,
            type: 'pointerleave'
        });
    });


    it('disable events and validate', async function() {
        linkLayer.pointerEvents(false);

        let listener = new testUtils.Listener(display, ['pointerenter', 'pointerleave']);

        await testUtils.events.mousemove(mapContainer, {x: 338, y: 267}, {x: 323, y: 288});
        await testUtils.events.mousemove(mapContainer, {x: 323, y: 288}, {x: 338, y: 274});

        let results = listener.stop();
        expect(results.pointerenter).to.have.lengthOf(0);
        expect(results.pointerleave).to.have.lengthOf(0);
    });

    it('enable events and validate again', async function() {
        linkLayer.pointerEvents(true);

        let listener = new testUtils.Listener(display, ['pointerenter', 'pointerleave']);

        await testUtils.events.mousemove(mapContainer, {x: 338, y: 274}, {x: 323, y: 288});
        await testUtils.events.mousemove(mapContainer, {x: 323, y: 288}, {x: 338, y: 274});

        let results = listener.stop();
        expect(results.pointerenter).to.have.lengthOf(1);
        expect(results.pointerleave).to.have.lengthOf(1);
    });
});
