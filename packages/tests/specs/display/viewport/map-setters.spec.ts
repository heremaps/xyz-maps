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
import dataset from './map-setters.json';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('Map setters', function() {
    let display;

    beforeEach(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomlevel: 18,
            layers: preparedData.getLayers(),
            maxLevel: 23
        });
    });

    afterEach(async function() {
        display.destroy();
    });

    it('validate map display is initialized correctly', function() {
        expect(display.getCenter()).toEqualWithTolerance({longitude: 77.79802, latitude: 12.62214}, 1e-7);
        expect(display.getHeight()).toBe(600);
        expect(display.getWidth()).toBe(800);
        expect(display.getLayers()).toHaveLength(4);
        expect(display.getViewBounds()).toEqualWithTolerance({
            minLon: 77.79587423,
            minLat: 12.62056956,
            maxLon: 77.80016576,
            maxLat: 12.62371043
        }, 1e-7);
        expect(display.getZoomlevel()).toBe(18);
    });

    it('set map center zoomlevel and validate', async function() {
        await waitForViewportReady(display, () => {
            display.setCenter(77.75143322, 12.62290951);
        });

        expect(display.getCenter()).toEqualWithTolerance({longitude: 77.75143322, latitude: 12.62290951}, 1e-7);
    });

    it('set zoom and validate', async function() {
        await waitForViewportReady(display, () => {
            display.setZoomlevel(19);
        });

        expect(display.getZoomlevel()).toEqual(19);
    });

    it('set zoom again and validate', async function() {
        await waitForViewportReady(display, () => {
            display.setCenter(77.75143322, 12.62290951);
            display.setZoomlevel(17.5);
        });

        expect(display.getZoomlevel()).toBe(17.5);

        expect(display.getCenter()).toEqualWithTolerance({
            longitude: 77.75143322, latitude: 12.62290951
        }, 1e-7);

        expect(display.getLayers()).toHaveLength(4);
    });

    it('validate screen size', function() {
        expect(display.getHeight()).toBe(600);
        expect(display.getWidth()).toBe(800);
    });

    it('validate viewport after changing center and zoom', async function() {
        await waitForViewportReady(display, () => {
            display.setCenter(77.75143322, 12.62290951);
            display.setZoomlevel(17.5);
        });
        const viewBounds = display.getViewBounds();
        expect(viewBounds).toEqualWithTolerance({
            minLon: 77.74839865,
            minLat: 12.62068858,
            maxLon: 77.75446779,
            maxLat: 12.6251304
        }, 1e-7);
    });

    it('set zoom 22.5 and validate viewbounds', async function() {
        await waitForViewportReady(display, () => {
            display.setCenter(77.75143322, 12.62290951);
            display.setZoomlevel(22.5);
        });

        expect(display.getZoomlevel()).toBe(22.5);

        const viewBounds = display.getViewBounds();

        expect(viewBounds).toEqualWithTolerance({
            minLon: 77.75133839,
            minLat: 12.62284011,
            maxLon: 77.75152805,
            maxLat: 12.62297891
        }, 1e-7);
    });

    it('try to set invalid maxzoom', async function() {
        await waitForViewportReady(display, () => {
            display.setZoomlevel(24);
        });

        expect(display.getZoomlevel()).toBe(23);
    });
});
