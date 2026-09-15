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
import {CircleStyle, Feature, LocalProvider, TileLayer} from '@here/xyz-maps-core';
import {waitForViewportReady} from 'displayUtils';
import {createPickingTerrain, sampleViewport, terrainScreenshot} from '../../../src/utils/terrainPicking';

describe('Terrain Circle picking', () => {
    const expect = chai.expect;
    let map: Map;
    let layer: TileLayer;
    let circle: Feature;

    before(async () => {
        const terrain = createPickingTerrain();
        layer = new TileLayer({min: 2, max: 20, provider: new LocalProvider()});
        circle = layer.addFeature({
            id: 'circle',
            type: 'Feature',
            properties: {},
            geometry: {type: 'Point', coordinates: [0.0038, 0.0031, 1350]}
        });
        map = new Map(document.getElementById('map'), {
            center: {longitude: 0.0038, latitude: 0.0031},
            zoomlevel: 16,
            pitch: 50,
            layers: [terrain, layer]
        });
        await waitForViewportReady(map);
    });

    after(() => map.destroy());

    const altitudes: CircleStyle['altitude'][] = [true, 'terrain'];
    const alignments: CircleStyle['alignment'][] = ['viewport', 'map'];
    for (const altitude of altitudes) {
        for (const alignment of alignments) {
            for (const offsets of [
                {offsetZ: 0}, {offsetZ: 40}, {offsetZ: '40m'}
            ]) {
                // GPU terrain depth bias keeps pixels visible that CPU picking rejects as occluded.
                // const test = altitude === 'terrain' && alignment === 'map' && (offsets.offsetZ === 0 || offsets.offsetZ === '40m') ? xit : it;
                it(`picks rendered ${alignment} Circle pixels with altitude:${altitude}, offsets:${JSON.stringify(offsets)}`, async () => {
                    layer.setStyleGroup(circle, [{
                        type: 'Circle', zIndex: 1, radius: 32, fill: '#ff0000', altitude, alignment, ...offsets
                    }]);
                    const {inside} = await terrainScreenshot(map);
                    expect(inside.length).to.be.greaterThan(20);
                    for (const pixel of inside) {
                        expect(map.getFeatureAt(pixel, {layers: [layer]})?.feature.id,
                            `rendered Circle pixel ${pixel.x},${pixel.y}`).to.equal(circle.id);
                    }
                });
            }
        }
    }

    for (const alignment of alignments) {
        it(`does not pick a ${alignment} altitude:true Circle hidden below terrain`, async () => {
            layer.setStyleGroup(circle, [{
                type: 'Circle', zIndex: 1, radius: 32, fill: '#ff0000',
                altitude: true, alignment, offsetZ: '-600m'
            }]);
            const {redPixels} = await terrainScreenshot(map);
            expect(redPixels).to.equal(0);
            const center = map.geoToPixel(0.0038, 0.0031, 750);
            for (const pixel of sampleViewport(map, [center])) {
                expect(map.getFeatureAt(pixel, {layers: [layer]})?.feature.id).to.equal(undefined);
            }
        });
    }
});
