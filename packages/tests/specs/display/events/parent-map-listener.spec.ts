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
import {Listener, prepare} from 'utils';
import {drag} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import dataset from './parent-map-listener.json';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('Parent Map listener', function() {
    let display;
    let mapContainer;
    let listener: Listener;

    beforeEach(async function() {
        listener = undefined;
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.00368500489765, latitude: 20.27239042522672},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });

        await waitForViewportReady(display);
        mapContainer = display.getContainer();
    });

    afterEach(async function() {
        listener?.stop();
        display.destroy();
    });

    it('validate mapviewchange start and end events', async function() {
        listener = new Listener(display, ['mapviewchangestart', 'mapviewchangeend']);

        await waitForViewportReady(display, async ()=>{
            await drag(mapContainer, {x: 100, y: 100}, {x: 150, y: 100});
        });

        let results = listener.stop();

        expect((results.mapviewchangestart).length).toBeGreaterThan(0);
        expect((results.mapviewchangeend).length).toBeGreaterThan(0);

        // number of triggered mapviewchangestart events are greater or equal to mapviewchangeend events
        expect(results.mapviewchangeend.length).not.toBeGreaterThan(results.mapviewchangestart.length);
    });

    it('validate mapviewchange start and end events with setting map center', async function() {
        listener = new Listener(display, ['mapviewchangestart', 'mapviewchangeend']);

        await waitForViewportReady(display, async ()=>{
            await drag(mapContainer, {x: 100, y: 100}, {x: 150, y: 100});
        });

        await waitForViewportReady(display, ()=>{
            display.setCenter({longitude: 73.00185037393146, latitude: 20.273578002075286});
        });

        let results = listener.stop();

        expect((results.mapviewchangestart).length).toBeGreaterThan(1);
        expect((results.mapviewchangeend).length).toBeGreaterThan(1);
    });

    it('lock viewport and validate mapviewchange start and end events', async function() {
        display.setBehavior('drag', false);

        listener = new Listener(display, ['mapviewchangestart', 'mapviewchangeend']);

        await drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});

        let results = listener.stop();
        expect(results.mapviewchangestart).toHaveLength(0);
        expect(results.mapviewchangeend).toHaveLength(0);
    });

    it('unlock viewport and validate mapviewchange start and end events', async function() {
        display.setBehavior('drag', false);
        display.setBehavior('drag', true);

        listener = new Listener(display, ['mapviewchangestart', 'mapviewchangeend']);

        await waitForViewportReady(display, async ()=>{
            await drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});
        });

        let results = listener.stop();
        expect((results.mapviewchangestart).length).toBeGreaterThan(0);
        expect((results.mapviewchangeend).length).toBeGreaterThan(0);

        // number of triggered mapviewchangestart events are greater or equal to mapviewchangeend events
        expect(results.mapviewchangeend.length).not.toBeGreaterThan(results.mapviewchangestart.length);
    });
});
