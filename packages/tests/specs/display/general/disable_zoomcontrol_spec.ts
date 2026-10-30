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
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import dataset from './disable_zoomcontrol_spec.json';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('disable zoomcontrol component', function() {
    let preparedData;
    let display;
    let mapContainer;

    beforeEach(async function() {
        preparedData = await prepare(dataset);
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

    it('validate zoomcontrol component is active', async function() {
        expect(display.getZoomlevel()).toBe(18);

        await waitForViewportReady(display, async ()=>{
            // click zoom control to zoom in
            await userEvent.click(mapContainer, {position: {x: 765, y: 520}, modifiers: ['Alt']});
        });
        expect(display.getZoomlevel()).toBe(19);
    });

    it('re-initialize display with zoomcontrol disabled, validate zoomcontrol again', async function() {
        display.destroy();
        display = new Map(document.getElementById('map'), {
            ui: {
                ZoomControl: false
            },
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });

        expect(display.getZoomlevel()).toBe(18);

        // click the position where zoom control was
        await userEvent.click(mapContainer, {position: {x: 765, y: 520}, modifiers: ['Alt']});

        expect(display.getZoomlevel()).toBe(18);
    });


    it('re-initialize display with zoomcontrol enabled, validate zoomcontrol again', async function() {
        display.destroy();
        display = new Map(document.getElementById('map'), {
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });

        expect(display.getZoomlevel()).toBe(18);

        await waitForViewportReady(display, async ()=>{
            // click zoom control
            await userEvent.click(mapContainer, {position: {x: 765, y: 520}, modifiers: ['Alt']});
        });

        expect(display.getZoomlevel()).toBe(19);
    });
});
