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

import {addPolygon, FlatPolygon} from './addPolygon';
import {isInBox} from '../../../geometry';
import {Tile, GeoJSONCoordinate as Coordinate} from '@here/xyz-maps-core';
import {FlexArray} from './templates/FlexArray';
import {TypedArray} from './glType';

const MIN_VISIBLE_HEIGHT = 0.01;

const signedArea = (lineString: TypedArray, start: number, stop: number) => {
    let sum = 0;
    for (let i = start, len = stop - 1; i < len; i += 3) {
        let p1x = lineString[i];
        let p1y = lineString[i + 1];
        let p2x = lineString[i + 3];
        let p2y = lineString[i + 4];
        sum += (p2x - p1x) * (p1y + p2y);
    }
    return sum;
};


const addExterior = (
    flatPolygon: FlatPolygon,
    vertex: FlexArray,
    normals: FlexArray,
    vIndex: number[],
    tileSize: number,
    extrude: number,
    extrudeBase: number,
    strokeIndex?: number[]
) => {
    const holes = flatPolygon.holes;
    const vertexData = flatPolygon.vertices.data;
    const stop = flatPolygon.stop - 3;
    let start = flatPolygon.start;
    let holeIndex = 0;

    extrudeBase = extrudeBase || 0;

    let nextHole = holes.length === 0 ? -1 : start + holes[holeIndex] * 3 - 6;
    let ringStart = start;
    let ringStop = nextHole !== -1 ? nextHole + 3 : stop;
    let clockwise = signedArea(vertex.data, ringStart, ringStop) >= 0;

    while (start < stop) {
        let x1;
        let x2;
        let y1;
        let y2;

        if (clockwise) {
            const i = ringStop - (start - ringStart);
            x1 = vertexData[i];
            y1 = vertexData[i + 1];
            x2 = vertexData[i - 3];
            y2 = vertexData[i - 2];
        } else {
            x1 = vertexData[start];
            y1 = vertexData[start + 1];
            x2 = vertexData[start + 3];
            y2 = vertexData[start + 4];
        }

        const dx = Math.round(x1) - Math.round(x2);
        const dy = Math.round(y1) - Math.round(y2);

        if ((dx || dy) && (
            isInBox(x1, y1, 0, 0, tileSize, tileSize) || isInBox(x2, y2, 0, 0, tileSize, tileSize)
        )) {
            const vi = vertex.length / 3;
            vIndex.push(
                vi + 2, vi, vi + 1,
                vi + 3, vi + 2, vi + 1
            );
            strokeIndex?.push(vi, vi + 1, vi + 2, vi + 3, vi, vi + 2, vi + 1, vi + 3);

            vertex.push(
                x1, y1, extrude,
                x1, y1, extrudeBase,
                x2, y2, extrude,
                x2, y2, extrudeBase
            );

            const len = 127 / Math.sqrt(dx * dx + dy * dy);
            const nx = -dy * len;
            const ny = dx * len;
            normals.push(nx, ny, nx, ny, nx, ny, nx, ny);
        }

        if (start === nextHole) {
            // Move to next hole / ring
            start += 6;
            ringStart = start;
            holeIndex++;
            nextHole = holeIndex < holes.length ? flatPolygon.start + holes[holeIndex] * 3 - 6 : -1;
            ringStop = nextHole !== -1 ? nextHole + 3 : stop;
            clockwise = signedArea(vertex.data, ringStart, ringStop) < 0;
        } else {
            start += 3;
        }
    }
};


export const addExtrude = (
    vertex: FlexArray,
    normals: FlexArray,
    vIndex: number[],
    coordinates: Coordinate[][],
    tile: Tile,
    tileSize: number,
    extrude: number,
    extrudeBase: number,
    strokeIndex?: number[]
): FlatPolygon[] => {
    let v = vertex.length;
    const flatPolygon = addPolygon(vertex, coordinates, tile, tileSize, extrude);

    // add fake normals for top surface
    while (v < vertex.length) {
        // normals.push(0, 0, -1);
        normals.push(0, 0);
        v += 3;
    }

    if (extrude > MIN_VISIBLE_HEIGHT) {
        for (let flat of flatPolygon) {
            addExterior(flat, vertex, normals, vIndex, tileSize, extrude, extrudeBase, strokeIndex);
        }
    }

    return flatPolygon;
};


