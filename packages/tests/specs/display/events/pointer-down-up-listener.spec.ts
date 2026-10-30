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
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import dataset from './pointer-down-up-listener.json';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('Pointer down up listener', () => {
    let preparedData;
    let display;
    let mapContainer;
    let listener: Listener;


    beforeEach(async () => {
        listener = undefined;
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.02278439898076, latitude: 20.273712610318146},
            zoomlevel: 19,
            layers: preparedData.getLayers()
        });

        await waitForViewportReady(display);
        mapContainer = display.getContainer();
    });

    afterEach(async () => {
        listener?.stop();
        display.destroy();
        await preparedData.clear();
    });

    it('validate pointer down and up events on line', async () => {
        listener = new Listener(display, ['pointerdown', 'pointerup']);

        await userEvent.click(mapContainer, {position: {x: 554, y: 243}, modifiers: ['Alt']});

        let results = listener.stop();

        expect(results.pointerdown).toHaveLength(1);
        expect(results.pointerdown[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 554,
            mapY: 243,
            type: 'pointerdown'
        }));
        expect(results.pointerup).toHaveLength(1);
        expect(results.pointerup[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 554,
            mapY: 243,
            type: 'pointerup'
        }));
        expect(results.pointerup[0].nativeEvent).toEqual(expect.objectContaining({isTrusted: true, altKey: true}));

        const {geometry} = (<any>results.pointerup[0]).target;
        expect(geometry).toEqual(expect.objectContaining({
            type: 'LineString'
        }));
    });

    it('validate pointer down and up events on point', async () => {
        listener = new Listener(display, ['pointerdown', 'pointerup']);

        await userEvent.click(mapContainer, {position: {x: 616, y: 240}, modifiers: ['Alt']});

        let results = listener.stop();

        expect(results.pointerdown).toHaveLength(1);
        expect(results.pointerdown[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 616,
            mapY: 240,
            type: 'pointerdown'
        }));
        expect(results.pointerup).toHaveLength(1);
        expect(results.pointerup[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 616,
            mapY: 240,
            type: 'pointerup'
        }));
        const {geometry} = (<any>results.pointerup[0]).target;
        expect(geometry).toEqual(expect.objectContaining({
            type: 'Point'
        }));
    });


    it('validate pointer down and up events on the ground', async () => {
        listener = new Listener(display, ['pointerdown', 'pointerup']);

        await userEvent.click(mapContainer, {position: {x: 253, y: 204}, modifiers: ['Alt']});

        let results = listener.stop();

        expect(results.pointerdown).toHaveLength(1);
        expect(results.pointerup).toHaveLength(1);
    });

    it('validate pointer event target on polygon', async () => {
        await waitForViewportReady(display, () => {
            display.setCenter(-74.0067173729875, 40.70065214195145);
            display.setZoomlevel(16);
        });

        listener = new Listener(display, ['pointerup']);

        await userEvent.click(mapContainer, {position: {x: 430, y: 300}, modifiers: ['Alt']});

        let results = listener.stop();

        expect(results.pointerup).toHaveLength(1);
        expect(results.pointerup[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 430,
            mapY: 300,
            type: 'pointerup'
        }));
        const geometry = (<any>results.pointerup[0]).target.geometry;
        expect(geometry).toEqual(expect.objectContaining({
            type: 'Polygon'
        }));
    });

    it('validate pointer event target on polygon with hole', async () => {
        await waitForViewportReady(display, () => {
            display.setCenter(-74.0067173729875, 40.70065214195145);
            display.setZoomlevel(16);
        });
        listener = new Listener(display, ['pointerup']);

        await userEvent.click(mapContainer, {position: {x: 400, y: 280}, modifiers: ['Alt']});

        let results = listener.stop();

        expect(results.pointerup).toHaveLength(1);

        expect(results.pointerup[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 400,
            mapY: 280,
            type: 'pointerup'
        }));

        expect(results.pointerup[0].target).toBe(undefined);
    });

    it('validate pointer event target on linestring "inside" a polygon hole', async () => {
        await waitForViewportReady(display, () => {
            display.setCenter(-74.0067173729875, 40.70065214195145);
            display.setZoomlevel(16);
        });
        listener = new Listener(display, ['pointerup']);

        await userEvent.click(mapContainer, {position: {x: 400, y: 300}, modifiers: ['Alt']});

        let results = listener.stop();

        expect(results.pointerup).toHaveLength(1);
        expect(results.pointerup[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 400,
            mapY: 300,
            type: 'pointerup'
        }));
        const geometry = (<any>results.pointerup[0]).target.geometry;
        expect(geometry).toEqual(expect.objectContaining({
            type: 'LineString'
        }));
    });


    it('validate pointer-events on linestring with strokeWidth <1', async () => {
        await waitForViewportReady(display, () => {
            display.setCenter(-74.0067173729875, 40.70065214195145);
            display.setZoomlevel(16);
        });
        listener = new Listener(display, ['pointerup']);
        let layer = display.getLayers(0);

        layer.setStyleGroup(layer.search('testLine'), [{type: 'Line', zIndex: 12, stroke: 'red', strokeWidth: .9}]);

        await userEvent.click(mapContainer, {position: {x: 400, y: 300}, modifiers: ['Alt']});

        let results = listener.stop();

        expect(results.pointerup).toHaveLength(1);
        expect(results.pointerup[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 400,
            mapY: 300,
            type: 'pointerup'
        }));
        const geometry = (<any>results.pointerup[0]).target.geometry;
        expect(geometry).toEqual(expect.objectContaining({
            type: 'LineString'
        }));
    });

    it('validate pointer event target on polygon visualized as point', async () => {
        let testLayer = preparedData.getLayers('testLayer');
        let testPolygon = preparedData.getFeature('testLayer', 'Polygon');
        testLayer.setStyleGroup(testPolygon, [{zIndex: 100, type: 'Circle', radius: 32, fill: 'blue'}]);

        await waitForViewportReady(display, () => {
            display.setCenter(-74.0067173729875, 40.70065214195145);
            display.setZoomlevel(16);
        });

        listener = new Listener(display, ['pointerup']);

        await userEvent.click(mapContainer, {position: {x: 430, y: 300}, modifiers: ['Alt']});

        let results = listener.stop();

        expect(results.pointerup).toHaveLength(1);
        expect(results.pointerup[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 430,
            mapY: 300,
            type: 'pointerup'
        }));
        const geometry = (<any>results.pointerup[0]).target.geometry;
        expect(geometry).toEqual(expect.objectContaining({
            type: 'Polygon'
        }));
    });
});
