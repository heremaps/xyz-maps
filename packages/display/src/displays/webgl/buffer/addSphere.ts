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

import {FlexArray, SimpleArray} from './templates/FlexArray';
import {extentScale} from './templates/BoxBuffer';

export const calculateSurfaceNormal = (p1: number[], p2: number[], p3: number[]) => {
    const ux = p2[0] - p1[0];
    const uy = p2[1] - p1[1];
    const uz = p2[2] - p1[2];
    const vx = p3[0] - p1[0];
    const vy = p3[1] - p1[1];
    const vz = p3[2] - p1[2];
    return [
        Math.floor(127 * (uy * vz - uz * vy)),
        Math.floor(127 * (uz * vx - ux * vz)),
        Math.floor(127 * (ux * vy - uy * vx))
    ];
};


const buildSphereGeometry = (
    segmentsWidth: number = 8,
    segmentsHeight: number = 6,
    phiStart = 0,
    phiLength = Math.PI * 2,
    thetaStart = 0,
    thetaLength = Math.PI,
    radius: number = 1
) => {
    const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);
    const grid = [];
    const indices = [];
    const normals = [];
    let index = 0;

    for (let y = 0; y <= segmentsHeight; y++) {
        const row = [];
        const v = y / segmentsHeight;

        for (let x = 0; x <= segmentsWidth; x++) {
            const u = x / segmentsWidth;
            const sinTheta = Math.sin(thetaStart + v * thetaLength);
            normals.push(
                -Math.cos(phiStart + u * phiLength) * sinTheta * radius,
                Math.cos(thetaStart + v * thetaLength) * radius,
                -Math.sin(phiStart + u * phiLength) * sinTheta * radius
            );
            row.push(index++);
        }
        grid.push(row);
    }

    const surfaceNormals = [];

    for (let y = 0; y < segmentsHeight; y++) {
        for (let x = 0; x < segmentsWidth; x++) {
            const a = grid[y][x + 1];
            const b = grid[y][x];
            const c = grid[y + 1][x];
            const d = grid[y + 1][x + 1];

            if (y !== 0 || thetaStart > 0) {
                indices.push(a, b, d);

                const _a = normals.slice(a * 3, a * 3 + 3);
                const _b = normals.slice(b * 3, b * 3 + 3);
                const _d = normals.slice(d * 3, d * 3 + 3);

                const surfaceNormal = calculateSurfaceNormal(_a, _b, _d);
                surfaceNormals.push.apply(surfaceNormals, surfaceNormal);
                surfaceNormals.push.apply(surfaceNormals, surfaceNormal);
                surfaceNormals.push.apply(surfaceNormals, surfaceNormal);
            }
            if (y !== segmentsHeight - 1 || thetaEnd < Math.PI) {
                indices.push(b, c, d);

                const _b = normals.slice(b * 3, b * 3 + 3);
                const _c = normals.slice(c * 3, c * 3 + 3);
                const _d = normals.slice(d * 3, d * 3 + 3);

                const surfaceNormal = calculateSurfaceNormal(_b, _c, _d);
                surfaceNormals.push.apply(surfaceNormals, surfaceNormal);
                surfaceNormals.push.apply(surfaceNormals, surfaceNormal);
                surfaceNormals.push.apply(surfaceNormals, surfaceNormal);
            }
        }
    }

    let offsets = [];
    for (let i of indices) {
        offsets.push(
            127 + Math.floor(127 * normals[i * 3]),
            127 + Math.floor(127 * normals[i * 3 + 1]),
            127 + Math.floor(127 * normals[i * 3 + 2])
        );
    }
    return {normals: offsets, surfaceNormals};
};

let sphereMesh;

export const addSphere = (
    x: number,
    y: number,
    z: number,
    vertex: FlexArray,
    points: SimpleArray<number>,
    normal?: SimpleArray<number>
) => {
    sphereMesh = sphereMesh || buildSphereGeometry(16, 12);

    x *= extentScale;
    y *= extentScale;

    const hasZ = typeof z === 'number';

    z = hasZ && Math.round(z / 9000 * 0xffff);

    const {normals, surfaceNormals} = sphereMesh;
    for (let i = 0, length = normals.length; i < length; i += 3) {
        if (!hasZ) {
            vertex.push(x, y);
        } else {
            vertex.push(x, y, z);
        }
        points.push(normals[i], normals[i + 1], normals[i + 2]);
        normal?.push(surfaceNormals[i], surfaceNormals[i + 1], surfaceNormals[i + 2]);
    }
};

