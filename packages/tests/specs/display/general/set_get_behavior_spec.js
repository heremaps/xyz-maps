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

import {waitForViewportReady} from 'displayTests';
import {prepare} from 'testUtils';
import {drag, mousewheel} from 'utilEvents';
import {Map} from '@here/xyz-maps-core';
import chaiAlmost from 'chai-almost';
import dataset from './set_get_behavior_spec.json';

describe('set and get behavior', function() {
    const expect = chai.expect;

    let display;
    let mapContainer;

    before(async function() {
        chai.use(chaiAlmost(1e-7));
        let preparedData = await prepare(dataset);
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

    it('validate map display has correct values', async function() {
        expect(display.getCenter()).to.deep.equal({
            longitude: 77.79802, latitude: 12.62214
        });
        expect(display.getViewBounds()).to.deep.almost({
            maxLat: 12.623710427048564,
            maxLon: 77.80016576721192,
            minLat: 12.620569563312458,
            minLon: 77.7958742327881
        });
        expect(display.getZoomlevel()).to.equal(18);
    });

    it('set pan behavior to false and validate the map', async function() {
        display.setBehavior('drag', false);

        await drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});

        expect(display.getCenter()).to.deep.equal({
            longitude: 77.79802, latitude: 12.62214
        });
        expect(display.getViewBounds()).to.deep.almost({
            maxLat: 12.623710427048564,
            maxLon: 77.80016576721192,
            minLat: 12.620569563312458,
            minLon: 77.7958742327881
        });
        expect(display.getZoomlevel()).to.equal(18);
        expect(display.getBehavior()).to.deep.include({zoom: true, drag: false});
    });

    it('set pan behavior to false', async function() {
        display.setBehavior('drag', true);

        await waitForViewportReady(display, async ()=>{
            await drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});
        });

        expect(display.getCenter().longitude).to.not.equal(
            77.79802
        );
        expect(display.getBehavior()).to.deep.include(
            {zoom: true, drag: true}
        );
    });

    it('zoom out and validate', async function() {
        display.setBehavior('zoom', false);

        await mousewheel(mapContainer, 200, 210, 1);

        expect(display.getZoomlevel()).to.equal(18);
        expect(display.getBehavior()).to.deep.include({zoom: false, drag: true});
    });

    it('set zoom behavior to true and validate', async function() {
        display.setBehavior('zoom', true);

        await waitForViewportReady(display, ()=>{
            display.setZoomlevel(19);
        });

        expect(display.getZoomlevel()).to.equal(19);
        expect(display.getBehavior()).to.deep.include({zoom: true, drag: true});

        display.setBehavior('zoom', 'fixed');

        await waitForViewportReady(display, async ()=>{
            await mousewheel(mapContainer, 200, 210, -1);
        });

        expect(display.getZoomlevel()).to.equal(18);
    });
});
