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
import dataset from './set_get_viewbounds_spec.json';

describe('set and get viewbounds', function() {
    const expect = chai.expect;

    let display;

    before(async function() {
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
        expect(display.getViewBounds()).to.deep.equal({
            minLon: 77.7958742327881,
            minLat: 12.620569563312458,
            maxLon: 77.80016576721192,
            maxLat: 12.623710427048564
        });
    });

    it('set new viewbounds and validate', async function() {
        await displayTests.waitForViewportReady(display, ()=>{
            display.setViewBounds({minLon: 77.79373919441207, minLat: 12.620344456958378, maxLon: 77.7980307288359, maxLat: 12.623485323457771});
        });

        expect(display.getViewBounds()).to.deep.equal({
            maxLat: 12.623485318638373,
            maxLon: 77.7980307288359,
            minLat: 12.620344452138923,
            minLon: 77.79373919441207
        });
    });

    it('set new viewbounds and validate map center and zoomlevel', async function() {
        await displayTests.waitForViewportReady(display, ()=>{
            display.setViewBounds({minLon: 77.5960654672823, maxLat: 12.721019204453619, maxLon: 77.59821123449422, minLat: 12.71944937697039});
        });

        expect(display.getCenter()).to.deep.equal({longitude: 77.59713835088826, latitude: 12.720234290712003});
        expect(display.getZoomlevel()).to.equal(19);
    });

    it('set new viewbounds again and validate map center and zoomlevel', async function() {
        await displayTests.waitForViewportReady(display, ()=>{
            display.setViewBounds({minLon: 76.44793415940495, maxLat: 14.177960380886176, maxLon: 76.5165987101862, minLat: 14.128025137919971});
        });

        expect(display.getCenter()).to.deep.equal({longitude: 76.48226643479558, latitude: 14.152992759403073});
        expect(display.getZoomlevel()).to.equal(14);
    });

    it('set new viewbounds again and validate map center and zoomlevel', async function() {
        await displayTests.waitForViewportReady(display, ()=>{
            display.setViewBounds({minLon: 76.475896930898615, maxLat: 14.201168294682864, maxLon: 76.47804269811053, minLat: 14.199608138948952});
        });

        expect(display.getCenter()).to.deep.equal({longitude: 76.47696981450457, latitude: 14.200388216815908});
        expect(display.getZoomlevel()).to.equal(19);
    });
});
