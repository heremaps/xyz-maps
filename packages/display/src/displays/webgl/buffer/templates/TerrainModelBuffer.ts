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

import {ModelBuffer} from './ModelBuffer';
import {GeometryBuffer, ElementsDrawCmd} from '../GeometryBuffer';
import {Attribute} from '../Attribute';
import {Raycaster} from '../../Raycaster';
import {Texture} from '../../Texture';
import {sampleHeightMap} from '../../HeightMapTileCache';


const clipAxisSlab = (
    origin: number,
    dir: number,
    axisMax: number,
    range: { tMin: number; tMax: number }
): boolean => {
    if (dir !== 0) {
        let t1 = -origin / dir;
        let t2 = (axisMax - origin) / dir;
        if (t1 > t2) {
            const tmp = t1;
            t1 = t2;
            t2 = tmp;
        }
        range.tMin = Math.max(range.tMin, t1);
        range.tMax = Math.min(range.tMax, t2);
        return true;
    }
    return origin >= 0 && origin < axisMax;
};

export class TerrainModelBuffer extends ModelBuffer {
    isPointBuffer = false;

    /**
     * Fast terrain ray intersection using 2D DDA (Digital Differential Analyzer).
     * Tests only the triangles in cells crossed by the ray, supporting arbitrary
     * pitch, skirts and adaptively triangulated RTIN meshes.
     *
     * @internal
     * @hidden
     */
    static rayIntersectsDDA(
        buffer: GeometryBuffer,
        result: { z: number },
        tileX: number,
        tileY: number,
        rayCaster: Raycaster,
        heightMap: GeometryBuffer['heightMap'],
        exaggeration = 1,
        hmTransform?: Float32Array | null
    ): number | string {
        const {size, data: heightData, tileSize, padding = 0} = heightMap;
        const logicalSize = size - 2 * padding;
        const gridRes = logicalSize - 1; // number of logical cells per axis

        const {attributes} = buffer;
        const modelMatrixData = (attributes.a_modelMatrix as Attribute).data;
        const positionOffsetData = (attributes.a_offset as Attribute).data;

        // instance transform
        const scaleZ = modelMatrixData[10];
        const tx = modelMatrixData[12] + positionOffsetData[0];
        const ty = modelMatrixData[13] + positionOffsetData[1];
        const tz = modelMatrixData[14] + positionOffsetData[2];

        // heightmap cell size in tile-local units; independent of the vertex scale.
        const cellSize = tileSize / gridRes;

        // ray in tile-local space
        const ox = rayCaster.origin[0] - tileX;
        const oy = rayCaster.origin[1] - tileY;
        const oz = rayCaster.origin[2];
        const dx = rayCaster.direction[0];
        const dy = rayCaster.direction[1];

        // convert ray to grid space: gridPos = (tileLocal - translate) / cellSize
        const invCell = 1 / cellSize;
        const gox = (ox - tx) * invCell;
        const goy = (oy - ty) * invCell;
        const gdx = dx * invCell;
        const gdy = dy * invCell;

        // clip ray to grid bounds [0, gridRes] in grid space
        const clipRange = {tMin: 0, tMax: 1e15};
        if (!clipAxisSlab(gox, gdx, gridRes, clipRange) || !clipAxisSlab(goy, gdy, gridRes, clipRange)) {
            return; // parallel and outside
        }

        if (clipRange.tMin > clipRange.tMax || clipRange.tMax < 0) {
            // grid clip REJECT
            return;
        }

        // entry point in grid space
        const startT = Math.max(clipRange.tMin, 0);
        const startGX = gox + startT * gdx;
        const startGY = goy + startT * gdy;

        // current cell (clamped to valid range)
        let cellX = Math.max(0, Math.min(Math.floor(startGX), gridRes - 1));
        let cellY = Math.max(0, Math.min(Math.floor(startGY), gridRes - 1));

        // DDA step direction and deltas
        const stepX = gdx > 0 ? 1 : gdx < 0 ? -1 : 0;
        const stepY = gdy > 0 ? 1 : gdy < 0 ? -1 : 0;
        const tDeltaX = stepX !== 0 ? Math.abs(1 / gdx) : Infinity;
        const tDeltaY = stepY !== 0 ? Math.abs(1 / gdy) : Infinity;

        // t at which ray crosses next cell boundary (grid-space t, relative to grid-space origin)
        let tNextX = stepX > 0
            ? (cellX + 1 - gox) / gdx
            : stepX < 0 ? (cellX - gox) / gdx : Infinity;
        let tNextY = stepY > 0
            ? (cellY + 1 - goy) / gdy
            : stepY < 0 ? (cellY - goy) / gdy : Infinity;

        const v0 = [0, 0, 0];
        const v1 = [0, 0, 0];
        const v2 = [0, 0, 0];
        const rayOrigin = [ox, oy, oz];
        const rayDir = rayCaster.direction;
        const zScale = scaleZ * exaggeration;
        const zOffset = tz * exaggeration;

        // hmTransform = [offsetX, offsetY, scale] where offset/scale are in normalized [0,1] UV space.
        const hmOx = hmTransform ? hmTransform[0] : 0;
        const hmOy = hmTransform ? hmTransform[1] : 0;
        const hmScale = hmTransform ? hmTransform[2] : 1;

        const setCorner = (out: number[], col: number, row: number) => {
            out[0] = col * cellSize + tx;
            out[1] = row * cellSize + ty;
            out[2] = sampleHeightMap(heightData, size, tileSize, col * cellSize, row * cellSize,
                hmOx,
                hmOy,
                hmScale,
                padding
            ) * zScale + zOffset;
        };

        let hit = false;
        // worst-case traversal touches almost all x and y boundaries (~gridRes + gridRes), plus a small safety margin.
        const maxSteps = 2 * gridRes + 4;

        for (let step = 0; step < maxSteps; step++) {
            if (cellX < 0 || cellX >= gridRes || cellY < 0 || cellY >= gridRes) break;

            const c0 = cellX;
            const r0 = cellY;
            const c1 = cellX + 1;
            const r1 = cellY + 1;

            let t: number | null;
            let t2: number | null;

            // RTIN checkerboard pattern: even cells use "\" diagonal, odd cells use "/" diagonal
            if ((c0 + r0) & 1) {
                // "/" diagonal: (c1,r0) ↔ (c0,r1)
                // Triangle 1: (c0,r0) → (c1,r0) → (c0,r1)
                setCorner(v0, c0, r0);
                setCorner(v1, c1, r0);
                setCorner(v2, c0, r1);
                t = Raycaster.rayIntersectsTriangle(rayOrigin, rayDir, v0, v1, v2);
                if (t != null && t < result.z) {
                    result.z = t;
                    hit = true;
                }
                // Triangle 2: (c1,r0) → (c1,r1) → (c0,r1)
                setCorner(v0, c1, r0);
                setCorner(v1, c1, r1);
                setCorner(v2, c0, r1);
                t2 = Raycaster.rayIntersectsTriangle(rayOrigin, rayDir, v0, v1, v2);
                if (t2 != null && t2 < result.z) {
                    result.z = t2;
                    hit = true;
                }
            } else {
                // "\" diagonal: (c0,r0) ↔ (c1,r1)
                // Triangle 1: (c0,r0) → (c1,r0) → (c1,r1)
                setCorner(v0, c0, r0);
                setCorner(v1, c1, r0);
                setCorner(v2, c1, r1);
                t = Raycaster.rayIntersectsTriangle(rayOrigin, rayDir, v0, v1, v2);
                if (t != null && t < result.z) {
                    result.z = t;
                    hit = true;
                }
                // Triangle 2: (c0,r0) → (c1,r1) → (c0,r1)
                setCorner(v0, c0, r0);
                setCorner(v1, c1, r1);
                setCorner(v2, c0, r1);
                t2 = Raycaster.rayIntersectsTriangle(rayOrigin, rayDir, v0, v1, v2);
                if (t2 != null && t2 < result.z) {
                    result.z = t2;
                    hit = true;
                }
            }
            // DDA guarantees cells in ray-order → first hit is closest
            if (hit) break;
            // step to next cell
            if (tNextX < tNextY) {
                cellX += stepX;
                tNextX += tDeltaX;
            } else {
                cellY += stepY;
                tNextY += tDeltaY;
            }
        }

        if (hit) {
            const {idOffsets} = buffer;
            for (let i = 0, {length} = idOffsets; i < length; i += 2) {
                if (0 < idOffsets[i]) {
                    return idOffsets[i + 1];
                }
            }
        }
    };

    /**
     * Brute-force terrain ray intersection — tests every triangle in the mesh.
     * Used as fallback when heightmap grid data is not available.
     *
     * @internal
     * @hidden
     */
    static rayIntersectsBruteForce(
        buffer: GeometryBuffer,
        result: { z: number },
        tileX: number,
        tileY: number,
        rayCaster: Raycaster,
        exaggeration: number = 1
    ): number | string {
        const {attributes} = buffer;
        const positionAttr = attributes.a_position as Attribute;
        const modelMatrixData = (attributes.a_modelMatrix as Attribute).data;
        const positionOffsetData = (attributes.a_offset as Attribute).data;
        const position = positionAttr.data;
        const size = positionAttr.size;
        let rayOrigin = rayCaster.origin;
        const localOrigin: [number, number, number] = [rayOrigin[0] - tileX, rayOrigin[1] - tileY, rayOrigin[2]];
        rayOrigin = localOrigin;
        tileX = 0;
        tileY = 0;

        const rayDirection = rayCaster.direction;
        const t0 = [0, 0, 0];
        const t1 = [0, 0, 0];
        const t2 = [0, 0, 0];

        let bufferIndex = null;
        const heightMap = buffer.getHeightMap();
        const hmTransform = buffer.getHeightMapTransform() || [0, 0, 1];
        const hasSkirts = (heightMap as GeometryBuffer['heightMap'])?.skirtHeight > 0;
        const positionBits = position.BYTES_PER_ELEMENT * 8;
        const positionXMask: number = hasSkirts ? ((1 << (positionBits - 1)) - 1) : ((1 << positionBits) - 1);
        const computeWorldPos = (out: number[], i: number, modelMatrix, positionScaleX: number, positionScaleY: number, positionScaleZ: number, translateX: number, translateY: number, translateZ: number) => {
            const x0 = (position[i] & positionXMask) * positionScaleX;
            const y0 = position[i + 1] * positionScaleY;
            out[0] = tileX + x0 + translateX;
            out[1] = tileY + y0 + translateY;
            out[2] = heightMap
                ? TerrainModelBuffer.getVertexZ(x0, y0, heightMap, hmTransform) * positionScaleZ + translateZ
                : size === 3
                    ? position[i + 2] * positionScaleZ + translateZ
                    : 0;
            out[2] *= rayCaster.exaggeration;
        };

        for (let m = 0, i = 0, {length} = modelMatrixData; m < length; m += 16, i += 3) {
            const modelMatrix = modelMatrixData.subarray(m, m + 16);
            const positionScaleX = modelMatrix[0];
            const positionScaleY = modelMatrix[5];
            const positionScaleZ = modelMatrix[10];
            const translateX = modelMatrix[12] + positionOffsetData[i];
            const translateY = modelMatrix[13] + positionOffsetData[i + 1];
            const translateZ = modelMatrix[14] + positionOffsetData[i + 2];

            for (let group of buffer.groups) {
                const indexData = (<ElementsDrawCmd>group).index?.data;
                if (group.mode == GeometryBuffer.MODE_GL_LINES) continue;

                for (let i = 0; i < indexData.length; i += 3) {
                    const i0 = indexData[i] * size;
                    const i1 = indexData[i + 1] * size;
                    const i2 = indexData[i + 2] * size;

                    computeWorldPos(t0, i0, modelMatrix, positionScaleX, positionScaleY, positionScaleZ, translateX, translateY, translateZ);
                    computeWorldPos(t1, i1, modelMatrix, positionScaleX, positionScaleY, positionScaleZ, translateX, translateY, translateZ);
                    computeWorldPos(t2, i2, modelMatrix, positionScaleX, positionScaleY, positionScaleZ, translateX, translateY, translateZ);

                    const intersectRayLength = Raycaster.rayIntersectsTriangle(rayOrigin, rayDirection, t0, t1, t2);

                    if (intersectRayLength) {
                        if (intersectRayLength < result.z) {
                            bufferIndex = m;
                            result.z = intersectRayLength;
                        }
                    }
                }
            }
        }

        if (bufferIndex != null) {
            for (let i = 0, {idOffsets} = buffer, {length} = idOffsets; i < length; i += 2) {
                if (bufferIndex < idOffsets[i]) {
                    return idOffsets[i + 1];
                }
            }
        }
    }

    rayIntersects(
        buffer: GeometryBuffer,
        result: {
            z: number
        },
        tileX: number,
        tileY: number,
        rayCaster: Raycaster
    ): number | string {
        const heightMap = buffer.getHeightMap();

        if (heightMap && heightMap.data && heightMap.size > 1) {
            const hmTransform = buffer.getHeightMapTransform();
            return TerrainModelBuffer.rayIntersectsDDA(buffer, result, tileX, tileY, rayCaster, heightMap, rayCaster.exaggeration, hmTransform);
        }
        // fallback to brute-force for non-heightmap terrain (e.g. RTIN without heightmap data)
        return TerrainModelBuffer.rayIntersectsBruteForce(buffer, result, tileX, tileY, rayCaster, rayCaster.exaggeration);
    }

    populateGeometryBuffer(geoBuffer: GeometryBuffer) {
        super.populateGeometryBuffer(geoBuffer);
        geoBuffer.heightMap = this.heightMap;
        // geoBuffer.heightMap.texture = this.uniforms.uHeightMap;
    }

    getHeightMapTexture(): Texture {
        return this.uniforms.uHeightMap as Texture;
    }
}
