/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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

import {tile} from '@here/xyz-maps-core';

type Point = [number, number, number?];
type Rect = [number, number, number, number];

const isPointInRect = (point: Point, rect: Rect) => {
    const x = point[0];
    const y = point[1];
    return x > rect[0] && x <= rect[2] && y > rect[1] && y <= rect[3];
};

export const addPoint = (vertex: number[], coordinates: Point, tile: tile.Tile, tileSize: number): number => {
    const v = vertex.length;
    // only add Point data if its really inside tile (ignore tile margin)
    // to prevent alpha blending in case if opacity is used for rendering and point is close to boundaries.
    // tile based rendering does not clip so we can ignore if not inside.
    if (tile.isInside(coordinates)) {
    // if (isPointInRect(coordinates, tile.bounds)) {
        // add vertex data
        vertex[v] = tile.lon2x(coordinates[0], tileSize);
        vertex[v+1] = tile.lat2y(coordinates[1], tileSize);
        return v+2;
    }
};
