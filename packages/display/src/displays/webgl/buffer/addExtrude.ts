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

import {addPolygon, FlatPolygon} from './addPolygon';
// import {normalize} from './addLineString';
// import {normalize, cross} from 'gl-matrix/vec3';


const addExterior = (flatPolygon, vertex, normals, vIndex, extrude) => {
    const holes = flatPolygon.holes;
    const verts = flatPolygon.vertices;
    const stop = verts.length - 3;
    let start = 0;
    let holeIndex = 0;
    let nextHole = holes[holeIndex] * 3 - 6;
    let x1;
    let x2;
    let y1;
    let y2;
    let vi;

    while (start < stop) {
        x1 = verts[start];
        y1 = verts[start + 1];
        x2 = verts[start + 3];
        y2 = verts[start + 4];

        vi = vertex.length / 3;

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
        let x = x1 - x2;
        let y = y1 - y2;
        let len = x * x + y * y;
        let nx = y;
        let ny = -x;
        if (len > 0) {
            len = 127 / Math.sqrt(len);
            nx *= len;
            ny *= len;
        }

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

        if (start == nextHole) {
            start += 6;
            nextHole = holes[++holeIndex] * 3 - 6;
        } else {
            start += 3;
        }
    }
};


export const addExtrude = (vertex, normals, vIndex, coordinates, tile, tileSize: number, extrude: number): FlatPolygon => {
    let v = vertex.length;
    const flatPolygon = // feature.geometry._xyz ||
        addPolygon(vertex, coordinates, tile, tileSize, extrude);

    // add fake normals for top surface
    while (v < vertex.length) {
        normals.push(0, 0);
        v += 3;
    }

    if (flatPolygon instanceof Array) {
        for (let flat of flatPolygon) {
            addExterior(flat, vertex, normals, vIndex, extrude);
        }
    } else {
        addExterior(flatPolygon, vertex, normals, vIndex, extrude);
    }

    return <FlatPolygon>flatPolygon;
};


