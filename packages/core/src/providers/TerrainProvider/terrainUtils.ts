/*
 * Copyright (C) 2019-2025 HERE Europe B.V.
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
import {TerrainTileMesh} from '../../features/TerrainFeature';
import {add} from '@here/xyz-maps-common/src/Vec3';

type TypedArray =
    Float64Array
    | Float32Array
    | Uint16Array
    | Int16Array
    | Uint8Array
    | Uint32Array
    | Int8Array
    | Int32Array;

export enum Neighbor {
    LEFT = 'left',
    RIGHT = 'right',
    TOP = 'top',
    BOTTOM = 'bottom'
};


export const getOppositeNeighbor = (side: Neighbor): Neighbor => {
    return ({left: Neighbor.RIGHT, right: Neighbor.LEFT, top: Neighbor.BOTTOM, bottom: Neighbor.TOP})[side];
};

export const computeEdgeIndices = <T extends Uint16Array | Uint32Array>(
    vertices: ArrayLike<number>,
    stride: number = 2,
    TypedArray: { new(array: number[] | ArrayBufferLike): T } = Uint16Array as any,
    maxValue: number = 65535,
    skirtToMainVertexMap?: Map<number, number>
): { left: T, right: T, top: T, bottom: T } => {
    const left: number[] = [];
    const right: number[] = [];
    const top: number[] = [];
    const bottom: number[] = [];

    const addEdge = (edge: number[], ei: number) => {
        if (!skirtToMainVertexMap?.has(ei)) {
            edge.push(ei);
        }
    };

    for (let i = 0, {length} = vertices; i < length; i += stride) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const j = i / stride;
        if (x === 0) {
            addEdge(left, j);
        } else if (x === maxValue) {
            addEdge(right, j);
        }
        if (y === 0) {
            addEdge(top, j);
        } else if (y === maxValue) {
            addEdge(bottom, j);
        }
    }

    const edgeIndices = {
        left: new TypedArray(left),
        right: new TypedArray(right),
        top: new TypedArray(top),
        bottom: new TypedArray(bottom)
    };
    return edgeIndices;
};

export const stitchMeshBorders = (
    side: Neighbor,
    destTile: TerrainTileMesh,
    srcTile: TerrainTileMesh
) => {
    const {edgeIndices, vertices, normals} = destTile;
    const {vertices: neighborVertices, normals: neighborNormals} = srcTile;
    const destBorderIndices = edgeIndices[side];
    const neighborBorderIndices = srcTile.edgeIndices[getOppositeNeighbor(side)];
    const maxValue = 0xffff;
    const oppositeX = side === Neighbor.RIGHT ? -maxValue : side === Neighbor.LEFT ? maxValue : 0;
    const oppositeY = side === Neighbor.BOTTOM ? -maxValue : side === Neighbor.TOP ? maxValue : 0;

    // Precompute a mirrored lookup table for fast opposite border access
    const indexMap = new Map<number, number>();
    for (let i of destBorderIndices) {
        const vi = i * 3;
        const x = vertices[vi] + oppositeX;
        const y = vertices[vi + 1] + oppositeY;
        indexMap.set((x << 16) | y, vi);
    }

    for (let i = 0, {length} = neighborBorderIndices; i < length; i++) {
        const index = neighborBorderIndices[i];
        const ni = index * 3;
        const nx = neighborVertices[ni];
        const ny = neighborVertices[ni + 1];
        const vi = indexMap.get((nx << 16) | ny);

        if (vi === undefined) continue;

        vertices[vi + 2] = neighborVertices[ni + 2];

        if (!normals) continue;
        // let [anx, any, anz] = getAvgNormal(index, neighborNormals, vi, normals);
        const anx = (normals[vi] + neighborNormals[ni]) * .5;
        const any = (normals[vi + 1] + neighborNormals[ni + 1]) * .5;
        const anz = (normals[vi + 2] + neighborNormals[ni + 2]) * .5;

        normals[vi] = anx;
        normals[vi + 1] = any;
        normals[vi + 2] = anz;

        neighborNormals[ni] = anx;
        neighborNormals[ni + 1] = any;
        neighborNormals[ni + 2] = anz;
    }
};

export const quantizeVertexData = (
    vertices: TypedArray,
    scaleXY: number = 1,
    scaleZ: (v: number) => number = (v) => v,
    elevationData?: ArrayLike<number>
) => {
    const is3d = !elevationData;
    const vertices3d = is3d
        ? vertices
        : new Float32Array(vertices.length / 2 * 3);

    const gridSize = Math.sqrt(elevationData?.length);
    const d = (2 + Number(is3d));
    const length = vertices.length / d;

    for (let i = 0; i < length; i++) {
        const j = i * d;
        const x = vertices[j];
        const y = vertices[j + 1];
        const z = is3d
            ? vertices[j + 2]
            : elevationData[y * gridSize + x];

        vertices3d[j] = x * scaleXY;
        vertices3d[j + 1] = y * scaleXY;
        vertices3d[j + 2] = scaleZ(z);
    }
    return vertices3d;
};

type VertexData = Float64Array | Float32Array | Uint16Array | Int16Array | number[];

const accumulateFaceNormal = (vertex: VertexData, i1: number, i2: number, i3: number, normals: VertexData) => {
    const t3x = vertex[i1];
    const t3y = vertex[i1 + 1];
    const t3z = vertex[i1 + 2];

    const t2x = vertex[i2];
    const t2y = vertex[i2 + 1];
    const t2z = vertex[i2 + 2];

    const t1x = vertex[i3];
    const t1y = vertex[i3 + 1];
    const t1z = vertex[i3 + 2];

    const ux = t2x - t1x;
    const uy = t2y - t1y;
    const uz = t2z - t1z;

    const vx = t3x - t1x;
    const vy = t3y - t1y;
    const vz = t3z - t1z;

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


export const computeMeshNormals = (
    vertex: VertexData,
    index?: number[],
    skipIndices?: Map<number, number>,
    normals?: Float32Array
) => {
    const vertexLength = vertex.length;
    // const normals = new Float32Array(vertexLength);
    normals = normals?.fill(0) || new Float32Array(vertexLength);
    // const normals = new Array(vertexLength);

    if (!index) {
        for (let i = 0; i < vertexLength;) {
            accumulateFaceNormal(vertex, i, i + 3, i += 6, normals);
        }
    } else {
        for (let i = 0; i < index.length; i += 3) {
            const i1 = index[i];
            const i2 = index[i + 1];
            const i3 = index[i + 2];
            if (skipIndices?.has(i3)) continue;
            accumulateFaceNormal(vertex, i1 * 3, i2 * 3, i3 * 3, normals);
        }
    }

    // normalize and quantize normals
    const normalized = new Int16Array(vertexLength);
    // const normalized = new Int8Array(vertexLength);
    // const normalized = new Float32Array(vertexLength);
    for (let i = 0; i < vertexLength; i += 3) {
        const nx = normals[i];
        const ny = normals[i + 1];
        const nz = normals[i + 2];
        const invLen = 32767 / Math.sqrt(nx * nx + ny * ny + nz * nz) || 0;
        // const invLen = 127 / Math.sqrt(nx * nx + ny * ny + nz * nz) || 0;
        // const invLen = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz) || 0;
        normalized[i] = nx * invLen;
        normalized[i + 1] = ny * invLen;
        normalized[i + 2] = nz * invLen;
    }
    return normalized;
};
