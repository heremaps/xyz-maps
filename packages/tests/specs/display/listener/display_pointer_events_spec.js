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
import dataset from './display_pointer_events_spec.json';

describe('validate pointer events', function() {
    const expect = chai.expect;

    let preparedData;
    let display;
    let mapContainer;
    let pa;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.01133868832176, latitude: 20.284701029331405},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });

        await displayTests.waitForViewportReady(display);

        mapContainer = display.getContainer();
        pa = preparedData.getFeature('paLayer', -10791);
    });

    after(async function() {
        display.destroy();

        await preparedData.clear();
    });

    it('validate pointenter and pointerleave events', async function() {
        await testUtils.events.mousemove(mapContainer, {x: 100, y: 200}, {x: 540, y: 300});

        let listener = new testUtils.Listener(display, ['pointerenter', 'pointerleave']);

        await testUtils.events.mousemove(mapContainer, {x: 540, y: 300}, {x: 483, y: 352});
        await testUtils.events.mousemove(mapContainer, {x: 483, y: 352}, {x: 540, y: 300});

        let results = listener.stop();

        expect(results.pointerenter).to.have.lengthOf(1);
        expect(results.pointerleave).to.have.lengthOf(1);
    });

    it('validate pointdown and pointerup events', async function() {
        let result = display.getFeatureAt({x: 456, y: 352});
        let listener = new testUtils.Listener(display, ['pointerdown', 'pointerup']);

        await testUtils.events.click(mapContainer, 456, 352);

        let results = listener.stop();

        expect(results.pointerdown).to.have.lengthOf(1);
        expect(results.pointerdown[0]).to.deep.include({
            button: 0,
            mapX: 456,
            mapY: 352,
            type: 'pointerdown'
        });
        expect(results.pointerdown[0].target).to.deep.include({
            id: pa.id
        });
        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 456,
            mapY: 352,
            type: 'pointerup'
        });
        expect(results.pointerup[0].target).to.deep.include({
            id: pa.id
        });
    });

    it('validate pointenter and pointerleave again', async function() {
        let listener = new testUtils.Listener(display, ['pointerdown', 'pointerup']);

        await testUtils.events.click(mapContainer, 788, 352);

        let results = listener.stop();

        expect(results.pointerdown).to.have.lengthOf(1);
        expect(results.pointerup).to.have.lengthOf(1);
    });
});
