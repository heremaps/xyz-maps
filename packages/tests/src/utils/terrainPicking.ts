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

import {TerrainTileLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

type Pixel = {x: number, y: number};

const PIXEL_SAMPLE_STEP = 4;
const MAX_PICKING_SAMPLES = 24;
const VIEWPORT_SAMPLE_STEP = 50;

export const terrainFixtureUrl = () => new URL('/base/tests/assets/tiles/terrain-hill.png', window.location.href).href;

export const createPickingTerrain = () => new TerrainTileLayer({
    maxGeometricError: 0.2,
    elevation: {
        url: terrainFixtureUrl(),
        encoding: 'terrarium',
        // Keep the synthetic hill at the same geographic scale when the camera zoom is compensated.
        max: 15
    }
});

export const waitForTerrainRender = () => new Promise((resolve) => setTimeout(resolve, 300));

function selectSamples(samples: Pixel[], limit: number): Pixel[] {
    if (samples.length <= limit) return samples;

    const selected: Pixel[] = [];
    for (let i = 0; i < limit; i++) {
        selected.push(samples[Math.floor(i * (samples.length - 1) / (limit - 1))]);
    }
    return selected;
}

export function sampleViewport(map: Map, extra: Pixel[] = []): Pixel[] {
    const container = map.getContainer();
    const samples = extra.slice();
    for (let y = 10; y < container.clientHeight; y += VIEWPORT_SAMPLE_STEP) {
        for (let x = 10; x < container.clientWidth; x += VIEWPORT_SAMPLE_STEP) {
            samples.push({x, y});
        }
    }
    return samples;
}

export async function terrainScreenshot(map: Map) {
    await waitForTerrainRender();
    const canvas = await new Promise<HTMLCanvasElement>((resolve) => map.snapshot(resolve));
    const {width, height} = canvas;
    const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    const scale = width / map.getContainer().clientWidth;
    const isRed = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        return data[i] === 255 && data[i + 1] === 0 && data[i + 2] === 0;
    };
    const insideCandidates: Pixel[] = [];
    let redPixels = 0;
    for (let y = 3; y < height - 3; y += PIXEL_SAMPLE_STEP) {
        for (let x = 3; x < width - 3; x += PIXEL_SAMPLE_STEP) {
            if (isRed(x, y)) redPixels++;
            // Sample visible interiors, not antialiased edges or terrain silhouettes.
            if ([-3, 0, 3].every((dx) => [-3, 0, 3].every((dy) => isRed(x + dx, y + dy)))) {
                insideCandidates.push({x: (x + 0.5) / scale, y: (y + 0.5) / scale});
            }
        }
    }
    return {inside: selectSamples(insideCandidates, MAX_PICKING_SAMPLES), redPixels};
}
