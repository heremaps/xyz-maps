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

import {addPolygon, FlatPolygon} from './addPolygon';
import {isInBox} from '../../../geometry';
import {Tile, GeoJSONCoordinate as Coordinate} from '@here/xyz-maps-core';
import {FlexArray} from './templates/FlexArray';
import {TypedArray} from './glType';

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
    extrude: number
) => {
    const holes = flatPolygon.holes;
    const verts = flatPolygon.vertices;
    const stop = flatPolygon.stop - 3;
    let start = flatPolygon.start;
    let holeIndex = 0;
    let nextHole = start + holes[holeIndex] * 3 - 6;
    let clockwise = signedArea(vertex.data, start, nextHole ? nextHole + 3 : stop) >= 0;

    while (start < stop) {
        let x1;
        let x2;
        let y1;
        let y2;

        if (clockwise) {
            let i = flatPolygon.start + stop - start;
            x1 = verts.get(i);
            y1 = verts.get(i + 1);
            x2 = verts.get(i - 3);
            y2 = verts.get(i - 2);
        } else {
            x1 = verts.get(start);
            y1 = verts.get(start + 1);
            x2 = verts.get(start + 3);
            y2 = verts.get(start + 4);
        }

        let dx = Math.round(x1) - Math.round(x2);
        let dy = Math.round(y1) - Math.round(y2);

        if (
            (dx || dy) &&
            (isInBox(x1, y1, 0, 0, tileSize, tileSize) || isInBox(x2, y2, 0, 0, tileSize, tileSize))
        ) {
            let vi = vertex.length / 3;

            vIndex[vIndex.length] = vi + 2;
            vIndex[vIndex.length] = vi;
            vIndex[vIndex.length] = vi + 1;

            vIndex[vIndex.length] = vi + 3;
            vIndex[vIndex.length] = vi + 2;
            vIndex[vIndex.length] = vi + 1;

            vertex.push(
                x1, y1, extrude,
                x1, y1, 0,
                x2, y2, extrude,
                x2, y2, 0,
            );

            // normalize + cross
            let len = dx * dx + dy * dy;
            let nx = dy;
            let ny = -dx;
            len = 127 / Math.sqrt(len);
            nx *= len;
            ny *= len;

            normals.push(
                nx, ny,
                nx, ny,
                nx, ny,
                nx, ny
            );

            // let exterior = [x1 - x2, y1 - y2, 0];
            // normalize(exterior, exterior);
            // let up = [0, 0, -1];
            // let normal = cross(up, up, exterior);
            // let nx = normal[0];
            // let ny = normal[1];
            // let nz = normal[2];
            // normals.push(
            //     nx, ny, nz,
            //     nx, ny, nz,
            //     nx, ny, nz,
            //     nx, ny, nz
            // );
        }

        if (start == nextHole) {
            start += 6;
            nextHole = flatPolygon.start + holes[++holeIndex] * 3 - 6;
            // invert winding order for holes
            clockwise = signedArea(vertex.data, start, nextHole ? nextHole + 3 : stop) < 0;
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
    extrude: number
): FlatPolygon[] => {
    let v = vertex.length;
    const flatPolygon = addPolygon(vertex, coordinates, tile, tileSize, extrude);

    // add fake normals for top surface
    while (v < vertex.length) {
        normals.push(0, 0);
        v += 3;
    }

    if (extrude) {
        for (let flat of flatPolygon) {
            addExterior(flat, vertex, normals, vIndex, tileSize, extrude);
        }
    }


    return flatPolygon;
};


