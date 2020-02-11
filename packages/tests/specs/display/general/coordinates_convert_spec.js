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

import {displayTests, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import chaiAlmost from 'chai-almost';
import dataset from './coordinates_convert_spec.json';

describe('converts coordinates between pixel and geo', function() {
    const expect = chai.expect;

    let display;

    before(async function() {
        chai.use(chaiAlmost(1e-4));
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });

        await displayTests.waitForViewportReady(display);
    });

    after(async function() {
        display.destroy();
    });


    it('convert from pixel to geo coordinate', function() {
        expect(display.pixelToGeo(300, 300)).to.be.deep.almost({
            longitude: 77.79748355819703,
            latitude: 12.622140000000016
        });

        expect(display.geoToPixel(77.79802, 12.62214)).to.deep.equal({
            x: 400, y: 300
        });
    });


    it('reset center and convert again from pixel to geo coordinate', async function() {
        await displayTests.waitForViewportReady(display, ()=>{
            display.setCenter({longitude: 77.801566, latitude: 12.623742});
        });

        expect(display.pixelToGeo(300, 300)).to.be.deep.almost({
            longitude: 77.8010295581011,
            latitude: 12.623742
        });
        expect(display.geoToPixel(77.8010295581011, 12.623742)).to.be.deep.almost({
            x: 300, y: 300
        });
    });
});
