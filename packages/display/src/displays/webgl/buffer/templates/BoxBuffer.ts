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

import {decodeUint16z, getOffsetPixel, PointBuffer} from './PointBuffer';
import {FlexArray} from './FlexArray';
import {FlexAttribute} from './TemplateBuffer';
import {GeometryBuffer} from '../GeometryBuffer';
import {Raycaster} from '../../Raycaster';
import {Attribute} from '../Attribute';

export const extentScale = 32;

const scaleXY = 1 / extentScale;

export class BoxBuffer extends PointBuffer {
    flexAttributes: {
        'a_position': FlexAttribute,
        'a_point': FlexAttribute
        'a_normal'?: FlexAttribute
    };

    constructor(flat: boolean = true) {
        super(flat);
        // Box geometry is always represented in 3D space, even when input positions are 2D
        this._flat = false;

        this.flexAttributes.a_point = {
            data: new FlexArray(Uint16Array),
            size: 3
        };

        this.flexAttributes.a_normal = {
            data: new FlexArray(Int8Array),
            normalized: true,
            size: 3
        };

        this.light = 'defaultLight';
    }

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
        const height = heightMap.data[Math.round(y) * size + Math.round(x)];
        return height;
    }

    rayIntersects(buffer: GeometryBuffer, result: {
        z: number
    }, tileX: number, tileY: number, rayCaster: Raycaster): number | string {
        const {attributes} = buffer;
        const position = (attributes.a_position as Attribute).data;
        const size = (attributes.a_position as Attribute).size;
        const point = (attributes.a_point as Attribute).data;
        // const [scaleX, scaleY, scaleZ] = rayCaster.getInverseScaleFor(alignMap ? 'world' : 'screen', buffer.renderScale);
        const [scaleX, scaleY, scaleZ] = rayCaster.getInverseWorldScale(buffer.renderScale);
        const scaleByAltitude = <boolean>buffer.getUniform('u_scaleByAltitude');
        let index = null;
        const offset = size * 6 * 6;
        let [offsetX, offsetY, offsetZ] = getOffsetPixel(buffer, rayCaster.scale);
        const {sMat} = rayCaster;
        const m3 = sMat[3]; // projX_w
        const m7 = sMat[7]; // projY_w
        const m11 = sMat[11]; // projZ_w
        const m15 = sMat[15]; // projW_w

        offsetX *= scaleX;
        offsetY *= scaleY;
        offsetZ *= scaleZ;

        const heightMap = buffer.getHeightMap();

        for (let i = 0, {length} = position; i < length; i += offset) {
            const x = tileX + position[i] * scaleXY + offsetX;
            const y = tileY + position[i + 1] * scaleXY + offsetY;
            // const z = (size == 3 ? decodeUint16z(position[i + 2]) : 0) + offsetZ;
            let z = (heightMap
                ? BoxBuffer.getVertexZ(heightMap, x, y)
                : (size === 2 ? 0 : decodeUint16z(position[i + 2]))
            ) + offsetZ;

            const scaleDZ = 1 + (scaleByAltitude ? 0 : z * m11 / (m3 * x + m7 * y + m15));
            // const scaleDZ = scaleByAltitude ? 1 : Math.min(Math.max(1 + (z * m11) / (m3 * x + m7 * y + m15), .5), 2);

            // Offsets (point[i]) represent the full box size -> offset only half the size from center to edge
            const halfScaledDZ = scaleDZ * 0.5;
            const w = (point[i] >> 1) * scaleX * halfScaledDZ;
            const h = (point[i + 1] >> 1) * scaleY * halfScaledDZ;
            const d = (point[i + 2] >> 1) * scaleZ * halfScaledDZ;

            const intersectRayLength = rayCaster.intersectAABBox(
                x - w, y - h, z - d,
                x + w, y + h, z + d
            );

            if (intersectRayLength != null) {
                if (intersectRayLength < result.z) {
                    result.z = intersectRayLength;
                    index = i;
                }
            }
        }

        if (index != null) {
            return buffer.idOffsets[Math.floor(index / offset)];
        }
    }
}
