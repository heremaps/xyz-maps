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

import {prepare} from 'testUtils';
import {waitForViewportReady} from 'displayTests';
import {Map} from '@here/xyz-maps-core';
import chaiAlmost from 'chai-almost';
import dataset from './set_get_viewbounds_spec.json';

describe('set and get viewbounds', function() {
    const expect = chai.expect;

    let display;

    before(async function() {
        chai.use(chaiAlmost(1e-7));
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
    });

    after(async function() {
        display.destroy();
    });

    it('validate viewbounds', function() {
        expect(display.getViewBounds()).to.deep.almost({
            minLon: 77.7958742327881,
            minLat: 12.620569563312458,
            maxLon: 77.80016576721192,
            maxLat: 12.623710427048564
        });
    });

    it('set new viewbounds and validate', async function() {
        await waitForViewportReady(display, ()=>{
            display.setViewBounds({minLon: 77.793739194, minLat: 12.620344457, maxLon: 77.798030729, maxLat: 12.623485323});
        });
        expect(display.getViewBounds()).to.deep.almost({
            minLon: 77.793739194,
            minLat: 12.620344457,
            maxLon: 77.798030729,
            maxLat: 12.623485323
        });
    });

    it('set new viewbounds and validate map center and zoomlevel', async function() {
        await waitForViewportReady(display, ()=>{
            display.setViewBounds({minLon: 77.596065467, maxLat: 12.7210192045, maxLon: 77.598211234, minLat: 12.719449377});
        });

        expect(display.getCenter()).to.deep.almost({longitude: 77.5971383505, latitude: 12.72023429075});
        expect(display.getZoomlevel()).to.equal(19);
    });

    it('set new viewbounds again and validate map center and zoomlevel', async function() {
        await waitForViewportReady(display, ()=>{
            display.setViewBounds({minLon: 76.447934159, maxLat: 14.177960381, maxLon: 76.51659871, minLat: 14.1280251379});
        });

        expect(display.getCenter()).to.deep.almost({longitude: 76.4822664345, latitude: 14.15299275945});
        expect(display.getZoomlevel()).to.equal(14);
    });

    it('set new viewbounds again and validate map center and zoomlevel', async function() {
        await waitForViewportReady(display, ()=>{
            display.setViewBounds({minLon: 76.475896931, maxLat: 14.201168294, maxLon: 76.478042698, minLat: 14.199608139});
        });

        expect(display.getCenter()).to.deep.almost({longitude: 76.4769698145, latitude: 14.2003882165});
        expect(display.getZoomlevel()).to.equal(19);
    });
});
