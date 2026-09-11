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

export async function terrainScreenshot(map: Map) {
    // Match the style-update settling delay used by the canvas-color test helpers.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const canvas = await new Promise<HTMLCanvasElement>((resolve) => map.snapshot(resolve));
    const {width, height} = canvas;
    const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    const scale = width / map.getContainer().clientWidth;
    const isRed = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        return data[i] === 255 && data[i + 1] === 0 && data[i + 2] === 0;
    };
    const inside: {x: number, y: number}[] = [];
    let redPixels = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (isRed(x, y)) redPixels++;
            // Sample visible interiors, not antialiased edges or terrain silhouettes.
            if (x >= 3 && y >= 3 && x < width - 3 && y < height - 3 && x % 4 === 0 && y % 4 === 0 &&
                [-3, 0, 3].every((dx) => [-3, 0, 3].every((dy) => isRed(x + dx, y + dy)))) {
                inside.push({x: (x + 0.5) / scale, y: (y + 0.5) / scale});
            }
        }
    }
    return {inside, redPixels};
}
