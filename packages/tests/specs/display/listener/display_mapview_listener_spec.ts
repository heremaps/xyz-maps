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
import dataset from './display_mapview_listener_spec.json';
import {vi, describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('mapview change listener', function() {
    let display;
    let mapContainer;

    beforeAll(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.00368500489765, latitude: 20.27239042522672},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });

        mapContainer = display.getContainer();
        await waitForViewportReady(display);
    });

    afterAll(async function() {
        display.destroy();
    });

    it('validate mapview events are triggered by dragging map', async function() {
        let listener = new Listener(display, ['mapviewchangestart', 'mapviewchangeend']);

        await waitForViewportReady(display, async ()=>{
            await drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});
        });

        let results = listener.stop();

        expect((results.mapviewchangestart).length).toBeGreaterThan(0);
        expect((results.mapviewchangeend).length).toBeGreaterThan(0);
    });

    it('validate mapview events numbers after dragging map', async function() {
        // mapviewchangestart and mapviewchangeend are expected to be triggered in pairs
        let listener = new Listener(display, ['mapviewchangestart', 'mapviewchangeend']);

        await waitForViewportReady(display, async ()=>{
            await drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});
        });

        let results = listener.stop();

        expect(results.mapviewchangeend.length).toBe(results.mapviewchangestart.length);
    });

    it('pairs mapview events when movement resumes before the pending end', async function() {
        const listener = new Listener(display, ['mapviewchangestart', 'mapviewchangeend']);
        const getViewBounds = display.getViewBounds.bind(display);
        let reads = 0;
        let resumeMovement: () => void;
        const resume = new Promise<void>((resolve) => {
            resumeMovement = resolve;
        });
        const bounds = vi.spyOn(display, 'getViewBounds').mockImplementation(() => {
            const result = getViewBounds();
            // The third watcher tick sees stable bounds and schedules the pending end.
            if (++reads === 3) {
                queueMicrotask(() => {
                    display.pan(10, 0);
                    resumeMovement();
                });
            }
            return result;
        });
        try {
            await waitForViewportReady(display, async () => {
                display.pan(10, 0);
                await resume;
            });
            const results = listener.stop();
            expect((results.mapviewchangestart).length).toBeGreaterThan(0);
            expect(results.mapviewchangeend.length).toBe(results.mapviewchangestart.length);
        } finally {
            bounds.mockRestore();
            listener.stop();
        }
    });

    it('validate mapview events after dragging map slowly', async function() {
        // mapviewchangestart and mapviewchangeend are expected to be triggered in pairs
        let listener = new Listener(display, ['mapviewchangestart', 'mapviewchangeend']);

        await waitForViewportReady(display, async ()=>{
            await drag(mapContainer, {x: 200, y: 100}, {x: 100, y: 100}, 240);
        });

        let results = listener.stop();

        expect((results.mapviewchangestart).length).toBeGreaterThan(0);
        expect((results.mapviewchangeend).length).toBeGreaterThan(0);
        expect(results.mapviewchangeend.length).toBe(results.mapviewchangestart.length);
    });

    it('lock viewport for panning then validate mapview events after dragging map', async function() {
        display.lockViewport({pan: true});
        try {
            let listener = new Listener(display, ['mapviewchangestart', 'mapviewchangeend']);

            await drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});

            let results = listener.stop();
            expect(results.mapviewchangestart).toHaveLength(0);
            expect(results.mapviewchangeend).toHaveLength(0);
        } finally {
            display.lockViewport({pan: false});
        }
    });
});
