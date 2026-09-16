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
import {getCanvasPixelColor} from 'utils';
import {createPickingTerrain} from '../../../src/utils/terrainPicking';

type Pixel = {x: number, y: number};

const circleCoordinate = {longitude: 0.0038, latitude: 0.0031};
const circleProbeOffsets = [
    {x: 0, y: 0},
    {x: -32, y: 0},
    {x: 32, y: 0},
    {x: 0, y: -32},
    {x: 0, y: 32},
    {x: 0, y: -48},
    {x: 0, y: 48}
];

function circleProbes(map: Map, altitudes: number[]): Pixel[] {
    const probes: Pixel[] = [];
    for (const altitude of altitudes) {
        const center = map.geoToPixel({...circleCoordinate, altitude});
        for (const offset of circleProbeOffsets) {
            probes.push({x: center.x + offset.x, y: center.y + offset.y});
        }
    }
    return probes;
}

function redProbes(probes: Pixel[], colors: string | string[]): Pixel[] {
    const red: Pixel[] = [];
    probes.forEach((probe, index) => {
        const color = Array.isArray(colors) ? colors[index] : index == 0 ? colors : undefined;
        if (color == '#ff0000') red.push(probe);
    });
    return red;
}

async function readCircleColors(map: Map, altitudes: number[]) {
    const probes = circleProbes(map, altitudes);
    const colors = await getCanvasPixelColor(map.getContainer(), probes, {delay: 300});
    return {probes, red: redProbes(probes, colors)};
}

describe.skip('Terrain Circle picking', () => {
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
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
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
                    const altitudes = altitude === 'terrain' ? [1000, 1300, 1350] : [1350];
                    const {probes, red} = await readCircleColors(map, altitudes);
                    expect(red.length, 'rendered Circle color probes').to.be.greaterThan(0);
                    const picked = probes.find((pixel) => map.getFeatureAt(pixel, {layers: [layer]})?.feature.id == circle.id);
                    expect(picked, 'representative rendered Circle picking probe').to.not.equal(undefined);
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
            const {probes, red} = await readCircleColors(map, [750]);
            expect(red.length, 'hidden Circle color probes').to.equal(0);
            for (const pixel of probes) {
                expect(map.getFeatureAt(pixel, {layers: [layer]})?.feature.id).to.equal(undefined);
            }
        });
    }
});
