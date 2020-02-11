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
import dataset from './disable_zoomcontrol_spec.json';

describe('disable zoomcontrol component', function() {
    const expect = chai.expect;

    let preparedData;
    let display;
    let mapContainer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        mapContainer = display.getContainer();
    });

    after(async function() {
        display.destroy();
    });

    it('validate zoomcontrol component is active', async function() {
        expect(display.getZoomlevel()).to.equal(18);

        await displayTests.waitForViewportReady(display, ()=>{
            // click zoom control to zoom in
            testUtils.events.click(mapContainer, 765, 520);
        });
        expect(display.getZoomlevel()).to.equal(19);
    });

    it('re-initialize display with zoomcontrol disabled, validate zoomcontrol again', async function() {
        display.destroy();
        display = new Map(document.getElementById('map'), {
            UI: {
                ZoomControl: false
            },
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });

        expect(display.getZoomlevel()).to.equal(18);

        // click the position where zoom control was
        await testUtils.events.click(mapContainer, 765, 520);

        // await displayTests.waitForViewportReady(display);
        expect(display.getZoomlevel()).to.equal(18);
    });


    it('re-initialize display with zoomcontrol enabled, validate zoomcontrol again', async function() {
        display.destroy();
        display = new Map(document.getElementById('map'), {
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });

        expect(display.getZoomlevel()).to.equal(18);

        await displayTests.waitForViewportReady(display, ()=>{
            // click zoom control
            testUtils.events.click(mapContainer, 765, 520);
        });

        expect(display.getZoomlevel()).to.equal(19);
    });
});
