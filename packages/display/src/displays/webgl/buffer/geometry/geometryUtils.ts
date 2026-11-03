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

import type {TypedArray} from '../glType';

const averageFaceNormal = (vertex: ArrayLike<number>, i1: number, i2: number, i3: number, normals: TypedArray) => {
    const t1x = vertex[i1];
    const t1y = vertex[i1 + 1];
    const t1z = vertex[i1 + 2];

    const t2x = vertex[i2];
    const t2y = vertex[i2 + 1];
    const t2z = vertex[i2 + 2];

    const t3x = vertex[i3];
    const t3y = vertex[i3 + 1];
    const t3z = vertex[i3 + 2];

    const ux = t2x - t3x;
    const uy = t2y - t3y;
    const uz = t2z - t3z;

    const vx = t1x - t3x;
    const vy = t1y - t3y;
    const vz = t1z - t3z;

    // surface normal
    const nx = uz * vy - uy * vz;
    const ny = ux * vz - uz * vx;
    const nz = uy * vx - ux * vy;

    // sum normals, average
    normals[i1] += nx;
    normals[i1 + 1] += ny;
    normals[i1 + 2] += nz;

    normals[i2] += nx;
    normals[i2 + 1] += ny;
    normals[i2 + 2] += nz;

    normals[i3] += nx;
    normals[i3 + 1] += ny;
    normals[i3 + 2] += nz;
};

export function generateWireframeIndices(triangleIndices: ArrayLike<number>): Uint16Array | Uint32Array;

export function generateWireframeIndices(first: number, vertexCount: number): Uint16Array | Uint32Array;

export function generateWireframeIndices(
    triangleIndices: ArrayLike<number> | number,
    vertexCount?: number
): Uint16Array | Uint32Array {
    if (typeof triangleIndices === 'number') {
        if (vertexCount === undefined) {
            throw new TypeError('Wireframe generation from first requires a vertex count.');
        }
        const first = triangleIndices;
        const triangleCount = Math.floor(vertexCount / 3);
        const lastVertex = first + triangleCount * 3 - 1;
        const indices = lastVertex > 0xffff
            ? new Uint32Array(triangleCount * 6)
            : new Uint16Array(triangleCount * 6);

        for (let triangle = 0; triangle < triangleCount; triangle++) {
            const vertex = first + triangle * 3;
            const index = triangle * 6;
            indices[index] = vertex;
            indices[index + 1] = vertex + 1;
            indices[index + 2] = vertex + 1;
            indices[index + 3] = vertex + 2;
            indices[index + 4] = vertex + 2;
            indices[index + 5] = vertex;
        }

        return indices;
    }

    const edgeSet = new Set<string>();
    const lines: number[] = [];

    for (let i = 0; i < triangleIndices.length; i += 3) {
        const i0 = triangleIndices[i];
        const i1 = triangleIndices[i + 1];
        const i2 = triangleIndices[i + 2];

        const edges: [number, number][] = [
            [i0, i1],
            [i1, i2],
            [i2, i0]
        ];

        for (const [a, b] of edges) {
            const key = a < b ? `${a};${b}` : `${b};${a}`;
            if (!edgeSet.has(key)) {
                edgeSet.add(key);
                lines.push(a, b);
            }
        }
    }

    const IndexArrayConstructor =
        triangleIndices instanceof Uint32Array ? Uint32Array : Uint16Array;

    return new IndexArrayConstructor(lines);
}

export function computeNormals(vertex: ArrayLike<number>, index?: ArrayLike<number>): TypedArray {
    const vertexLength = vertex.length;
    const normals = new Float32Array(vertexLength);

    if (!index) {
        // flat shading
        let i = 0;
        while (i < vertexLength) {
            averageFaceNormal(vertex, i, i + 6, i + 3, normals);
            i += 9;
        }
    } else {
        // smooth shading
        for (let i = 0, {length} = index; i < length; i += 3) {
            // averageFaceNormal(vertex, index[i+2] * 3, index[i + 1] * 3, index[i] * 3, normals);
            averageFaceNormal(vertex, index[i] * 3, index[i + 1] * 3, index[i + 2] * 3, normals);
        }
    }
    // normalize and quantize
    const normalized = new Int8Array(vertexLength);
    // const normalized = new Int16Array(vertexLength);
    for (let i = 0, nx, ny, nz; i < vertexLength; i += 3) {
        nx = normals[i];
        ny = normals[i + 1];
        nz = normals[i + 2];
        const invLen = 127 / Math.sqrt(nx * nx + ny * ny + nz * nz) || 0;
        // const invLen = 32767 / Math.sqrt(nx * nx + ny * ny + nz * nz) || 0;
        normalized[i] = Math.round(nx * invLen);
        normalized[i + 1] = Math.round(ny * invLen);
        normalized[i + 2] = Math.round(nz * invLen);
    }
    return normalized;
}
