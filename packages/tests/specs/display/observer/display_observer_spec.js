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
import dataset from './display_observer_spec.json';

describe('map observer', function() {
    const expect = chai.expect;

    let display;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.00368500489765, latitude: 20.27239042522672},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
    });

    after(async function() {
        display.destroy();
    });

    it('set map center and validate observer', async function() {
        let observer = new testUtils.Observer(display, 'center');

        await displayTests.waitForViewportReady(display, ()=>{
            display.setCenter({
                longitude: 80.24112862940257,
                latitude: 15.693135202251213
            });
        });

        await displayTests.waitForViewportReady(display, ()=>{
            display.setCenter({
                longitude: 80.04209397743875,
                latitude: 15.494536519179078
            });
        });

        let results = observer.stop();
        expect(results.center[0]).to.deep.equal({latitude: 15.693135202251213, longitude: 80.24112862940257});
        expect(results.center[1]).to.deep.equal({latitude: 15.494536519179078, longitude: 80.04209397743875});
    });

    it('set map center with same coord and validate observer again', async function() {
        display.setCenter({
            longitude: 80.04209397743875,
            latitude: 15.494536519179078
        });

        let observer = new testUtils.Observer(display, 'center');

        display.setCenter({
            longitude: 80.04209397743875,
            latitude: 15.494536519179078
        });

        let results = observer.stop();
        expect(results.center).to.have.lengthOf(0);
    });


    it('set zoomlevel and validate observer', async function() {
        let observer = new testUtils.Observer(display, 'zoomlevel');

        await displayTests.waitForViewportReady(display, ()=>{
            display.setZoomlevel(19);
        });

        let results = observer.stop();
        expect(results.zoomlevel[0]).to.equal(19);
    });
});
