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

import {tile} from '@here/xyz-maps-core';
import {FlexArray} from './templates/FlexArray';

type Tile = tile.Tile;

type Coordinate = [number, number, number?];

export type FlatPolygon = {
    vertices: FlexArray;
    holes: number[];
    dimensions: number;
    start: number;
    stop: number;
}

const flatten = (vertices: FlexArray, data: Coordinate[][], tile: Tile, tileSize: number, height?: number) => {
    const start = vertices.length;
    const holes = [];
    let holeIndex = 0;

    for (let i = 0; i < data.length; i++) {
        for (let j = 0, x, y; j < data[i].length; j++) {
            x = tile.lon2x(data[i][j][0], tileSize);
            y = tile.lat2y(data[i][j][1], tileSize);

            if (height) {
                vertices.push(x, y, height);
            } else {
                vertices.push(x, y);
            }
        }
        if (i > 0) {
            holeIndex += data[i - 1].length;
            holes[holes.length] = holeIndex;
        }
    }

    return {
        dimensions: height ? 3 : 2,
        vertices: vertices,
        holes: holes,
        start: start,
        stop: vertices.length
    };
};

const addPolygon = (
    vertex: FlexArray,
    coordinates: Coordinate[][] | Coordinate[][][],
    tile: Tile,
    tileSize: number,
    extrude?: number
): FlatPolygon[] => {
    let flatPolygons;
    if (typeof coordinates[0][0][0] != 'number') {
        // MultiPolygon: only for already triangulated data (MVT)
        flatPolygons = [];
        for (let poly of coordinates) {
            flatPolygons.push(flatten(vertex, <Coordinate[][]>poly, tile, tileSize, extrude));
        }
    } else {
        flatPolygons = [flatten(vertex, <Coordinate[][]>coordinates, tile, tileSize, extrude)];
    }
    return flatPolygons;
};

export {addPolygon};
