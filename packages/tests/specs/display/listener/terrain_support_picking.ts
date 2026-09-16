/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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

import {Map} from '@here/xyz-maps-display';
import {Feature, LocalProvider, TerrainTileLayer, TileLayer} from '@here/xyz-maps-core';
import {waitForViewportReady} from 'displayUtils';
import {Listener} from 'utils';
import {click} from 'triggerEvents';
import {
    createPickingTerrain, sampleViewport, terrainFixtureUrl, terrainScreenshot, waitForTerrainRender
} from '../../../src/utils/terrainPicking';

describe('Terrain support picking', () => {
    const expect = chai.expect;
    const dump = (phase: string) => window.__karma__.info({dump: `Terrain support setup: ${phase}`});
    let map: Map;
    let terrain: TerrainTileLayer;
    let overlay: TileLayer;
    let draped: Feature;
    let pixels: {x: number, y: number}[];

    before(async () => {
        dump('create terrain');
        terrain = createPickingTerrain();
        dump('create overlay');
        overlay = new TileLayer({
            min: 2, max: 20, provider: new LocalProvider(),
            style: {altitude: 'terrain', styleGroups: {}}
        });
        draped = overlay.addFeature({
            id: 'draped-slope',
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [0.0033, 0.0026], [0.0043, 0.0026],
                    [0.0043, 0.0036], [0.0033, 0.0036], [0.0033, 0.0026]
                ]]
            }
        }, [{type: 'Polygon', zIndex: 1, fill: '#ff0000'}]);
        dump('construct map');
        map = new Map(document.getElementById('map'), {
            center: {longitude: 0.0038, latitude: 0.0031},
            zoomlevel: 16,
            pitch: 50,
            maxPitch: 75,
            layers: [terrain]
        });
        dump('map constructed');
        await waitForViewportReady(map);
        dump('terrain ready');
        map.addLayer(overlay);
        dump('overlay added');
        await waitForViewportReady(map, [overlay]);
        dump('overlay ready');
        pixels = (await terrainScreenshot(map)).inside;
        dump('initial screenshot ready');
        expect(pixels.length, 'rendered draped polygon on the slope').to.be.greaterThan(20);
    });

    after(() => map.destroy());

    beforeEach(async () => {
        terrain.pointerEvents(false);
        overlay.pointerEvents(true);
        await waitForTerrainRender();
    });

    it('uses a 512x512 Terrarium hill with a flat, seamless 1000 m border', async () => {
        const image = new Image();
        image.src = terrainFixtureUrl();
        await image.decode();
        expect([image.naturalWidth, image.naturalHeight]).to.deep.equal([512, 512]);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 512;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const data = context.getImageData(0, 0, 512, 512).data;
        const elevation = (x: number, y: number) => {
            const i = (y * 512 + x) * 4;
            return data[i] * 256 + data[i + 1] + data[i + 2] / 256 - 32768;
        };
        let maximum = 0;
        for (let y = 0; y < 512; y++) {
            for (let x = 0; x < 512; x++) {
                const height = elevation(x, y);
                maximum = Math.max(maximum, height);
                expect(height).to.be.within(1000, 1300);
                if (x < 16 || y < 16 || x >= 496 || y >= 496) expect(height).to.equal(1000);
            }
        }
        expect(maximum).to.be.closeTo(1300, 0.1);
        expect(Math.abs(elevation(150, 245) - elevation(290, 245))).to.be.greaterThan(10);
        const heights = pixels.map((pixel) => map.getTerrainPointAt(pixel)?.altitude);
        expect(Math.min(...heights)).to.be.greaterThan(1000);
        expect(Math.max(...heights) - Math.min(...heights), 'draped polygon spans the hill slope').to.be.greaterThan(20);
    });

    for (const enabled of [false, true]) {
        for (const selection of ['implicit', 'overlay only', 'terrain and overlay']) {
            it(`picks rendered draped pixels with terrain pointerEvents:${enabled}, layers:${selection}`, () => {
                terrain.pointerEvents(enabled);
                const options = selection === 'implicit' ? undefined :
                    {layers: selection === 'overlay only' ? [overlay] : [terrain, overlay]};
                for (const pixel of pixels) {
                    const result = map.getFeatureAt(pixel, options);
                    expect(result?.feature.id, `draped pixel ${pixel.x},${pixel.y}`).to.equal(draped.id);
                    expect(result?.layer?.id).to.equal(overlay.id);
                }
            });
        }
    }

    it('does not leak terrain support into an empty or excluded layer selection', () => {
        for (const enabled of [false, true]) {
            terrain.pointerEvents(enabled);
            for (const pixel of pixels) {
                expect(map.getFeatureAt(pixel, {layers: []})?.feature.id).to.equal(undefined);
                const result = map.getFeatureAt(pixel, {layers: [terrain]});
                // Explicit API queries are independent of pointer-event subscription.
                expect(result?.layer?.id).to.equal(terrain.id);
                expect(result?.feature.id).not.to.equal(draped.id);
            }
        }
    });

    it('honors overlay pointerEvents without losing selectable terrain', async () => {
        const pixel = pixels[Math.floor(pixels.length / 2)];
        const pointerTarget = async () => {
            const listener = new Listener(map, ['pointerup']);
            let events;
            try {
                await click(map.getContainer(), pixel.x, pixel.y);
            } finally {
                events = listener.stop().pointerup;
            }
            expect(events.length).to.equal(1);
            return events[0].target?.id;
        };
        expect(await pointerTarget()).to.equal(draped.id);
        overlay.pointerEvents(false);
        expect(await pointerTarget()).to.equal(undefined);
        terrain.pointerEvents(true);
        expect(await pointerTarget()).to.equal(map.getFeatureAt(pixel, {layers: [terrain]})?.feature.id);
        overlay.pointerEvents(true);
        expect(await pointerTarget()).to.equal(draped.id);
    });

    it('picks draped pixels shifted away from the polygon sea-level projection', () => {
        const seaLevel = map.geoToPixel({longitude: 0.0038, latitude: 0.0031, altitude: 0});
        expect(Math.min(...pixels.map((pixel) => Math.hypot(pixel.x - seaLevel.x, pixel.y - seaLevel.y))))
            .to.be.greaterThan(40);
        for (const pixel of pixels) {
            expect(map.getFeatureAt(pixel, {layers: [overlay]})?.feature.id).to.equal(draped.id);
        }
    });

    it('retains closer 3D circles and occludes circles below the terrain support', async () => {
        const circle = overlay.addFeature({
            id: 'above-slope',
            type: 'Feature',
            properties: {},
            geometry: {type: 'Point', coordinates: [0.0038, 0.0031, 1350]}
        }, [{type: 'Circle', zIndex: 2, radius: 24, fill: '#ff0000', altitude: true}]);
        overlay.setStyleGroup(draped, [{type: 'Polygon', zIndex: 1, fill: '#0000ff'}]);
        try {
            const visible = await terrainScreenshot(map);
            expect(visible.inside.length).to.be.greaterThan(20);
            for (const pixel of visible.inside) {
                expect(map.getFeatureAt(pixel, {layers: [overlay]})?.feature.id).to.equal(circle.id);
            }
            overlay.setStyleGroup(circle, [{
                type: 'Circle', zIndex: 2, radius: 24, fill: '#ff0000', altitude: true, offsetZ: '-600m'
            }]);
            expect((await terrainScreenshot(map)).redPixels).to.equal(0);
            const center = map.geoToPixel(0.0038, 0.0031, 750);
            for (const pixel of sampleViewport(map, [center])) {
                expect(map.getFeatureAt(pixel, {layers: [overlay]})?.feature.id).not.to.equal(circle.id);
            }
        } finally {
            overlay.removeFeature(circle);
            overlay.setStyleGroup(draped, [{type: 'Polygon', zIndex: 1, fill: '#ff0000'}]);
        }
    });

    it('occludes a rear-slope circle behind the hill, not outside the viewport', async () => {
        overlay.setStyleGroup(draped, [{type: 'Polygon', zIndex: 1, fill: '#0000ff'}]);
        const rear = overlay.addFeature({
            id: 'rear-slope',
            type: 'Feature',
            properties: {},
            geometry: {type: 'Point', coordinates: [0.00472, 0.0083, 1180]}
        }, [{type: 'Circle', zIndex: 2, radius: 12, fill: '#ff0000', altitude: true}]);
        try {
            await waitForViewportReady(map, () => {
                map.setCenter({longitude: 0.00472, latitude: 0.0057});
                map.pitch(0);
            }, 5000, 'rear-slope: pitch 0');
            const visible = await terrainScreenshot(map);
            expect(visible.inside.length, 'rear circle visible from above').to.be.greaterThan(5);
            for (const pixel of visible.inside) {
                expect(map.getFeatureAt(pixel, {layers: [overlay]})?.feature.id).to.equal(rear.id);
            }
            await waitForViewportReady(map, () => map.pitch(75), 5000, 'rear-slope: pitch 75');
            expect(map.pitch()).to.be.closeTo(75, 1e-6);
            const projected = map.geoToPixel(0.00472, 0.0083, 1180);
            expect(projected.x).to.be.within(20, map.getContainer().clientWidth - 20);
            expect(projected.y).to.be.within(20, map.getContainer().clientHeight - 20);
            expect((await terrainScreenshot(map)).redPixels, 'hidden by the hill crest').to.equal(0);
            for (const enabled of [false, true]) {
                terrain.pointerEvents(enabled);
                for (const pixel of sampleViewport(map, [projected])) {
                    expect(map.getFeatureAt(pixel, {layers: [overlay]})?.feature.id).not.to.equal(rear.id);
                }
            }
        } finally {
            overlay.removeFeature(rear);
            overlay.setStyleGroup(draped, [{type: 'Polygon', zIndex: 1, fill: '#ff0000'}]);
            await waitForViewportReady(map, () => {
                map.setCenter({longitude: 0.0038, latitude: 0.0031});
                map.pitch(50);
            }, 5000, 'rear-slope: cleanup');
        }
    });

    it('does not retain terrain support after removing the terrain layer', async () => {
        await waitForViewportReady(map, [overlay], () => {
            map.removeLayer(terrain);
            map.pitch(0);
        });
        const {inside} = await terrainScreenshot(map);
        expect(inside.length).to.be.greaterThan(20);
        for (const pixel of inside) {
            expect(map.getFeatureAt(pixel, {layers: [overlay]})?.feature.id).to.equal(draped.id);
            expect(map.getFeatureAt(pixel, {layers: []})?.feature.id).to.equal(undefined);
        }
    });
});
