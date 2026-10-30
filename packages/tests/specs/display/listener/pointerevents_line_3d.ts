/*
 * Copyright (C) 2019-2023 HERE Europe B.V.
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
import {Listener} from 'utils';
import {TileLayer, LocalProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {userEvent} from 'vitest/browser';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('Pointerevents Line 3d', () => {
    let display;
    let mapContainer;
    let line1;
    let layer;
    let listener: Listener;

    beforeEach(async () => {
        listener = undefined;
        layer = new TileLayer({
            min: 2,
            max: 20,
            provider: new LocalProvider(),
            style: {
                styleGroups: {
                    line: [{
                        zIndex: 0,
                        type: 'Line',
                        stroke: '#ff0000',
                        strokeWidth: 32,
                        altitude: 0.01
                    }]
                },
                assign() {
                    return 'line';
                }
            }
        });

        display = new Map(document.getElementById('map'), {
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {
                longitude: 11.58487, latitude: 48.21255
            },
            zoomlevel: 20,
            layers: [layer]
        });

        let geo0 = display.pixelToGeo(200, 200);
        let geo1 = display.pixelToGeo(200, 400);

        line1 = layer.addFeature({
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: [
                    [geo0.longitude, geo0.latitude],
                    [geo1.longitude, geo1.latitude]
                ]
            }
        });
        await waitForViewportReady(display);

        mapContainer = display.getContainer();
    });

    afterEach(() => {
        listener?.stop();
        display.destroy();
    });

    it('pointerup: line3d edge inside', async () => {
        listener = new Listener(display, ['pointerup']);

        const x = 200 - 16 + 2;
        const y = 300;

        await userEvent.click(mapContainer, {position: {x: x, y: y}, modifiers: ['Alt']});

        const results = listener.stop().pointerup;
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: x,
            mapY: y,
            type: 'pointerup'
        }));

        expect(results[0].target).toBe(line1);
    });

    it('pointerup: line3d edge outside', async () => {
        listener = new Listener(display, ['pointerup']);

        const x = 200 - 16 - 2;
        const y = 300;

        await userEvent.click(mapContainer, {position: {x: x, y: y}, modifiers: ['Alt']});

        const results = listener.stop().pointerup;
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: x,
            mapY: y,
            type: 'pointerup'
        }));

        expect(results[0].target).toBe(undefined);
    });

    it('pointerup: line3d edge inside (zoom scaled)', async () => {
        display.setZoomlevel(19.99);
        await waitForViewportReady(display);


        listener = new Listener(display, ['pointerup']);

        const x = 200 - 16 + 2;
        const y = 300;

        await userEvent.click(mapContainer, {position: {x: x, y: y}, modifiers: ['Alt']});

        const results = listener.stop().pointerup;
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: x,
            mapY: y,
            type: 'pointerup'
        }));

        expect(results[0].target).toBe(line1);
    });

    it('pointerup: line3d edge outside (zoom scaled)', async () => {
        display.setZoomlevel(19.99);
        await waitForViewportReady(display);

        listener = new Listener(display, ['pointerup']);

        const x = 200 - 16 - 2;
        const y = 300;

        await userEvent.click(mapContainer, {position: {x: x, y: y}, modifiers: ['Alt']});

        const results = listener.stop().pointerup;
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: x,
            mapY: y,
            type: 'pointerup'
        }));

        expect(results[0].target).toBe(undefined);
    });
});
