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
import dataset from './display_multi_mapview_listener_spec.json';

xdescribe('mapview start end end triggered multiple times', function() {
    const expect = chai.expect;

    let display;
    let mapContainer;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.00368500489765, latitude: 20.27239042522672},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });

        mapContainer = display.getContainer();
    });

    after(async function() {
        display.destroy();
    });

    it('mapviewchangestart mapviewchangeend should be triggered in pairs', async function() {
        await displayTests.waitForViewportReady(display, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});
        });
    });
});
