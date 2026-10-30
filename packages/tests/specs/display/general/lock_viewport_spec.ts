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

import {waitForViewportReady} from 'displayUtils';
import {prepare} from 'utils';
import {drag, mousewheel} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import dataset from './lock_viewport_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('validate lockviewport function', function() {
    let display;
    let mapContainer;

    beforeAll(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        mapContainer = display.getContainer();
        display.setBehavior('zoom', 'fixed');
    });

    afterAll(async function() {
        display.destroy();
    });

    it('simply validate map', async function() {
        expect(display.getCenter()).toEqual({longitude: 77.79802, latitude: 12.62214});
        expect(display.getViewBounds()).toEqualWithTolerance({
            maxLat: 12.623710427048564,
            maxLon: 77.80016576721192,
            minLat: 12.620569563312458,
            minLon: 77.7958742327881
        }, 1e-7);
        expect(display.getZoomlevel()).toBe(18);
    });

    it('validate map again after locking viewport for panning and drag', async function() {
        display.lockViewport({pan: true});

        // try dragging the map
        await drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});

        expect(display.getCenter()).toEqual({longitude: 77.79802, latitude: 12.62214});
        expect(display.getViewBounds()).toEqualWithTolerance({
            maxLat: 12.623710427048564,
            maxLon: 77.80016576721192,
            minLat: 12.620569563312458,
            minLon: 77.7958742327881
        }, 1e-7);
        expect(display.getZoomlevel()).toBe(18);
    });

    it('validate map is dragged after viewport for panning is unlocked', async function() {
        display.lockViewport({pan: false});

        // drag map
        await waitForViewportReady(display, async ()=>{
            await drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});
        });

        // validate map center is changed
        expect(display.getCenter().longitude).not.toBe(77.79802);
        // validate map viewbound is changed
        expect(display.getViewBounds().minLon).not.toBe(77.79587423278804);
    });

    it('validate zoomlevel is locked for minLevel', async function() {
        display.lockViewport({minLevel: 17});

        await waitForViewportReady(display, async ()=>{
            // zoom map with mouse wheel
            await mousewheel(mapContainer, 100, 100, -1);
            await mousewheel(mapContainer, 100, 100, -1);
            await mousewheel(mapContainer, 100, 100, -1);
        });

        // validate map is not zoomed
        expect(display.getZoomlevel()).toBe(17);
    });

    it('validate zoomlevel is not locked', async function() {
        display.setZoomlevel(17);

        display.lockViewport({minLevel: 1});

        await waitForViewportReady(display, async ()=>{
            await mousewheel(mapContainer, 100, 110, -1);
            await mousewheel(mapContainer, 100, 110, -1);
        });

        expect(display.getZoomlevel()).toBeLessThan(17);
    });

    it('validate zoomlevel is locked with maxLevel to 18', async function() {
        await waitForViewportReady(display, ()=>{
            display.setZoomlevel(18);
        });

        display.lockViewport({maxLevel: 18});

        await mousewheel(mapContainer, 100, 100, 1);

        expect(display.getZoomlevel()).toBe(18);
    });

    it('validate zoomlevel is locked with maxLevel to 20', async function() {
        display.setZoomlevel(18);

        display.lockViewport({maxLevel: 20});

        await waitForViewportReady(display, async ()=>{
            await mousewheel(mapContainer, 100, 100, 1);
            await mousewheel(mapContainer, 100, 100, 1);
            await mousewheel(mapContainer, 100, 100, 1);
        });

        expect(display.getZoomlevel()).toBeGreaterThan(18);

        display.lockViewport({minLevel: 1, maxLevel: 20});
    });
});
