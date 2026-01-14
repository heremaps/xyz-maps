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

export class TerrainModelBuffer extends ModelBuffer {
    static getVertexZ(heightMap: GeometryBuffer['heightMap'], x: number, y: number): number {
        const {tileSize, size} = heightMap;
        const lastRowColIndex = size - 1;
        x = x / tileSize * lastRowColIndex;
        y = y / tileSize * lastRowColIndex;
        // const {tileSize, size, padding = 0} = heightMap;
        // const usable = size - 2 * padding - 1;
        // Map x/y from [0, tileSize] to [padding, size - padding - 1]
        // x = padding + (x / tileSize) * usable;
        // y = padding + (y / tileSize) * usable;
        return heightMap.data[Math.round(y) * size + Math.round(x)];
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
        const hasSkirts = (heightMap as GeometryBuffer['heightMap'])?.skirtHeight > 0;
        // The MSB of the x position encodes the skirt flag; mask clears it to get the base coordinate.
        // If hasSkirts, clear MSB; otherwise, use all bits
        const positionBits = position.BYTES_PER_ELEMENT * 8;
        const positionXMask: number = hasSkirts ? ((1 << (positionBits - 1)) - 1) : ((1 << positionBits) - 1);
        // const positionXMask: number = hasSkirts ? 0x7FFF : 0xFFFF;
        const computeWorldPos = (out: number[], i: number, modelMatrix, positionScaleX: number, positionScaleY: number, positionScaleZ: number, translateX: number, translateY: number, translateZ: number) => {
            const x0 = (position[i] & positionXMask) * positionScaleX;
            const y0 = position[i + 1] * positionScaleY;
            out[0] = tileX + x0 + translateX;
            out[1] = tileY + y0 + translateY;
            out[2] = heightMap
                ? TerrainModelBuffer.getVertexZ(heightMap, x0, y0) * positionScaleZ + translateZ
                : size === 3
                    ? position[i + 2] * positionScaleZ + translateZ
                    : 0;
        };


        for (let m = 0, i = 0, {length} = modelMatrixData; m < length; m += 16, i += 3) {
            const modelMatrix = modelMatrixData.subarray(m, m + 16);
            // scale to tile size in pixel
            const positionScaleX = modelMatrix[m];
            const positionScaleY = modelMatrix[m + 5];
            const positionScaleZ = modelMatrix[m + 10];
            const translateX = modelMatrix[m + 12] + positionOffsetData[i];
            const translateY = modelMatrix[m + 13] + positionOffsetData[i + 1];
            const translateZ = modelMatrix[m + 14] + positionOffsetData[i + 2];

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
                            // bufferIndex = Math.max(i0, i1, i2);
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

    populateGeometryBuffer(geoBuffer: GeometryBuffer) {
        super.populateGeometryBuffer(geoBuffer);
        geoBuffer.heightMap = this.heightMap;
        // geoBuffer.heightMap.texture = this.uniforms.uHeightMap;
    }

    getHeightMapTexture(): Texture {
        return this.uniforms.uHeightMap as Texture;
    }
}
