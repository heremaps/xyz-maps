/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
import {describe, beforeAll, afterAll, it, chai, expect} from 'vitest';

describe('get functions', function() {
    let display;

    beforeAll(async function() {
        chai.use(chaiAlmost(1e-7));
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
    });

    afterAll(async function() {
        display.destroy();
    });

    it('validate map display has correct values', async function() {
        expect(display.getCenter()).toEqual({longitude: 77.79802, latitude: 12.62214});
        expect(display.getHeight()).toBe(600);
        expect(display.getWidth()).toBe(800);
        expect(display.getLayers()).toHaveLength(1);
        chai.expect(display.getViewBounds()).to.deep.almost({
            maxLat: 12.623710427048564,
            maxLon: 77.80016576721192,
            minLat: 12.620569563312458,
            minLon: 77.7958742327881
        });
        expect(display.getZoomlevel()).toBe(18);
    });

    it('validate map display has correct values after zoom and pan the map', async function() {
        await waitForViewportReady(display, ()=>{
            display.setZoomlevel(19);
            display.setCenter({longitude: 77.799607868, latitude: 12.622584955});
        });

        expect(display.getCenter()).toEqual({longitude: 77.799607868, latitude: 12.622584955});
        expect(display.getHeight()).toBe(600);
        expect(display.getWidth()).toBe(800);
        expect(display.getLayers()).toHaveLength(1);
        chai.expect(display.getViewBounds()).to.deep.almost({
            minLon: 77.79853498439405,
            minLat: 12.621799739226546,
            maxLon: 77.80068075160597,
            maxLat: 12.623370168363635
        });
        expect(display.getZoomlevel()).toBe(19);
    });
});
