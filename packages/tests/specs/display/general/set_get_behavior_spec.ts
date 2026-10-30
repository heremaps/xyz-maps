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
import dataset from './set_get_behavior_spec.json';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('set and get behavior', function() {
    let display;
    let mapContainer;

    beforeEach(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        mapContainer = display.getContainer();
    });

    afterEach(async function() {
        display.destroy();
    });

    it('validate map display has correct values', async function() {
        expect(display.getCenter()).toEqual({
            longitude: 77.79802, latitude: 12.62214
        });
        expect(display.getViewBounds()).toEqualWithTolerance({
            maxLat: 12.623710427048564,
            maxLon: 77.80016576721192,
            minLat: 12.620569563312458,
            minLon: 77.7958742327881
        }, 1e-7);
        expect(display.getZoomlevel()).toBe(18);
    });

    it('set pan behavior to false and validate the map', async function() {
        display.setBehavior('drag', false);

        await drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});

        expect(display.getCenter()).toEqual({
            longitude: 77.79802, latitude: 12.62214
        });
        expect(display.getViewBounds()).toEqualWithTolerance({
            maxLat: 12.623710427048564,
            maxLon: 77.80016576721192,
            minLat: 12.620569563312458,
            minLon: 77.7958742327881
        }, 1e-7);
        expect(display.getZoomlevel()).toBe(18);
        expect(display.getBehavior()).toEqual(expect.objectContaining({zoom: true, drag: false}));
    });

    it('re-enable dragging and pan the map', async function() {
        display.setBehavior('drag', false);
        display.setBehavior('drag', true);

        await waitForViewportReady(display, async ()=>{
            await drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});
        });

        expect(display.getCenter().longitude).not.toBe(
            77.79802
        );
        expect(display.getBehavior()).toEqual(
            expect.objectContaining({zoom: true, drag: true})
        );
    });

    it('pitch and rotate without panning with a modifier drag', async function() {
        display.setBehavior('pitch', true);
        display.setBehavior('rotate', true);

        const center = display.getCenter();
        const pitch = display.pitch();
        const rotation = display.rotate();

        await waitForViewportReady(display, async ()=>{
            await drag(mapContainer, {x: 200, y: 200}, {x: 240, y: 160}, 60, 0, {ctrlKey: true});
        });

        expect(display.getCenter()).toEqual(center);
        expect(display.pitch()).not.toBe(pitch);
        expect(display.rotate()).not.toBe(rotation);
    });

    it('ignore wheel input when zoom behavior is disabled', async function() {
        display.setBehavior('zoom', false);

        await mousewheel(mapContainer, 200, 210, 1);

        expect(display.getZoomlevel()).toBe(18);
        expect(display.getBehavior()).toEqual(expect.objectContaining({zoom: false, drag: true}));
    });

    it('set zoom behavior to true and validate', async function() {
        display.setBehavior('zoom', false);
        display.setBehavior('zoom', true);

        await waitForViewportReady(display, ()=>{
            display.setZoomlevel(19);
        });

        expect(display.getZoomlevel()).toBe(19);
        expect(display.getBehavior()).toEqual(expect.objectContaining({zoom: true, drag: true}));

        display.setBehavior('zoom', 'fixed');

        await waitForViewportReady(display, async ()=>{
            await mousewheel(mapContainer, 200, 210, -1);
        });

        expect(display.getZoomlevel()).toBe(18);
    });
});
