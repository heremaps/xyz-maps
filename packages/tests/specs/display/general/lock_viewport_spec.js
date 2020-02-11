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
import dataset from './lock_viewport_spec.json';

describe('validate lockviewport function', function() {
    const expect = chai.expect;

    let display;
    let mapContainer;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        mapContainer = display.getContainer();
        display.setBehavior('zoom', 'fixed');
    });

    after(async function() {
        display.destroy();
    });

    it('simply validate map', async function() {
        expect(display.getCenter()).to.deep.equal({longitude: 77.79802, latitude: 12.62214});
        expect(display.getViewBounds()).to.deep.equal({
            maxLat: 12.623710427048564,
            maxLon: 77.80016576721192,
            minLat: 12.620569563312458,
            minLon: 77.7958742327881
        });
        expect(display.getZoomlevel()).to.equal(18);
    });


    it('validate map again after locking viewport for panning and drag', async function() {
        display.lockViewport({pan: true});

        // try dragging the map
        await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});

        expect(display.getCenter()).to.deep.equal({longitude: 77.79802, latitude: 12.62214});
        expect(display.getViewBounds()).to.deep.equal({
            maxLat: 12.623710427048564,
            maxLon: 77.80016576721192,
            minLat: 12.620569563312458,
            minLon: 77.7958742327881
        });
        expect(display.getZoomlevel()).to.equal(18);
    });


    it('validate map is dragged after viewport for panning is unlocked', async function() {
        display.lockViewport({pan: false});

        // drag map
        await displayTests.waitForViewportReady(display, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});
        });

        // validate map center is changed
        expect(display.getCenter().longitude).to.not.equal(77.79802);
        // validate map viewbound is changed
        expect(display.getViewBounds().minLon).to.not.equal(77.79587423278804);
    });

    it('validate zoomlevel is locked for minLevel', async function() {
        display.lockViewport({minLevel: 17});

        await displayTests.waitForViewportReady(display, async ()=>{
            // zoom map with mouse wheel
            await testUtils.events.mousewheel(mapContainer, 100, 100, -1);
            await testUtils.events.mousewheel(mapContainer, 100, 100, -1);
            await testUtils.events.mousewheel(mapContainer, 100, 100, -1);
        });

        // validate map is not zoomed
        expect(display.getZoomlevel()).to.equal(17);
    });


    it('validate zoomlevel is not locked', async function() {
        display.setZoomlevel(17);

        display.lockViewport({minLevel: 1});

        await displayTests.waitForViewportReady(display, async ()=>{
            await testUtils.events.mousewheel(mapContainer, 100, 110, -1);
            await testUtils.events.mousewheel(mapContainer, 100, 110, -1);
        });

        expect(display.getZoomlevel()).to.be.below(17);
    });

    it('validate zoomlevel is locked with maxLevel to 18', async function() {
        await displayTests.waitForViewportReady(display, ()=>{
            display.setZoomlevel(18);
        });

        display.lockViewport({maxLevel: 18});

        await testUtils.events.mousewheel(mapContainer, 100, 100, 1);

        expect(display.getZoomlevel()).to.equal(18);
    });


    it('validate zoomlevel is locked with maxLevel to 20', async function() {
        display.setZoomlevel(18);

        display.lockViewport({maxLevel: 20});

        await displayTests.waitForViewportReady(display, async ()=>{
            await testUtils.events.mousewheel(mapContainer, 100, 100, 1);
            await testUtils.events.mousewheel(mapContainer, 100, 100, 1);
            await testUtils.events.mousewheel(mapContainer, 100, 100, 1);
        });

        expect(display.getZoomlevel()).to.be.above(18);

        display.lockViewport({minLevel: 1, maxLevel: 20});
    });
});
