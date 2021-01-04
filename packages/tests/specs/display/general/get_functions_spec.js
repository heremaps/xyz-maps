/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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

import {prepare} from 'utils';
import {waitForViewportReady} from 'displayUtils';
import {Map} from '@here/xyz-maps-display';
import chaiAlmost from 'chai-almost';
import dataset from './get_functions_spec.json';

describe('get functions', function() {
    const expect = chai.expect;

    let display;

    before(async function() {
        chai.use(chaiAlmost(1e-7));
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
    });

    after(async function() {
        display.destroy();
    });

    it('validate map display has correct values', async function() {
        expect(display.getCenter()).to.deep.equal({longitude: 77.79802, latitude: 12.62214});
        expect(display.getHeight()).to.equal(600);
        expect(display.getWidth()).to.equal(800);
        expect(display.getLayers()).to.have.lengthOf(1);
        expect(display.getViewBounds()).to.deep.almost({
            maxLat: 12.623710427048564,
            maxLon: 77.80016576721192,
            minLat: 12.620569563312458,
            minLon: 77.7958742327881
        });
        expect(display.getZoomlevel()).to.equal(18);
    });

    it('validate map display has correct values after zoom and pan the map', async function() {
        await waitForViewportReady(display, ()=>{
            display.setZoomlevel(19);
            display.setCenter({longitude: 77.799607868, latitude: 12.622584955});
        });

        expect(display.getCenter()).to.deep.equal({longitude: 77.799607868, latitude: 12.622584955});
        expect(display.getHeight()).to.equal(600);
        expect(display.getWidth()).to.equal(800);
        expect(display.getLayers()).to.have.lengthOf(1);
        expect(display.getViewBounds()).to.deep.almost({
            minLon: 77.79853498439405,
            minLat: 12.621799739226546,
            maxLon: 77.80068075160597,
            maxLat: 12.623370168363635
        });
        expect(display.getZoomlevel()).to.equal(19);
    });
});
