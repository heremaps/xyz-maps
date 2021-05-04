/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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

import {Tile, GeoJSONCoordinate} from '@here/xyz-maps-core';

const extentScale = 32;


export const addPoint = (vertex: number[], x: number, y: number): number => {
// export const addPoint = (vertex: number[], coordinates: GeoJSONCoordinate, tile?: Tile, tileSize?: number): number => {
    const v = vertex.length;
    // let x = coordinates[0];
    // let y = coordinates[1];

    // if (tile) {
    //     x = tile.lon2x(x, tileSize);
    //     y = tile.lat2y(y, tileSize);
    // }

    // make room for direction vector bit1 and visibility bit0 (LSB)
    x = x * extentScale << 2 | 1;
    y = y * extentScale << 2 | 1;

    //   0 ------ 1
    //   | `.     |
    //   |   `.   |
    //   |     `. |
    //   2 ------ 3

    const x0 = x; // left
    const y0 = y; // up

    const x1 = x | 2; // right
    const y1 = y0; // up

    const x2 = x0; // left
    const y2 = y | 2; // down

    const x3 = x1; // right
    const y3 = y2; // down

    vertex.push(
        // 0 -> 2 -> 3
        x0, y0,
        x2, y2,
        x3, y3,
        // 0 -> 3 -> 1
        x0, y0,
        x3, y3,
        x1, y1
    );

    return v + 12;
};
