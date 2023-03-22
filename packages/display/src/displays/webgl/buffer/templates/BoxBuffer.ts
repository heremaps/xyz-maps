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
        super(false);

        this.flexAttributes.a_point = {
            data: new FlexArray(Uint16Array),
            size: 3
        };

        this.flexAttributes.a_normal = {
            data: new FlexArray(Int8Array),
            normalized: true,
            size: 3
        };
    }

    rayIntersects(buffer: GeometryBuffer, result: { z: number }, tileX: number, tileY: number, rayCaster: Raycaster): number | string {
        const {attributes} = buffer;
        const position = (attributes.a_position as Attribute).data;
        const size = (attributes.a_position as Attribute).size;
        const point = (attributes.a_point as Attribute).data;
        const alignMap = true;
        const [scaleX, scaleY, scaleZ] = rayCaster.getInverseScale(alignMap);
        const scaleByAltitude = <boolean>buffer.getUniform('u_scaleByAltitude');
        let index = null;
        const offset = size * 6 * 6;
        let [offsetX, offsetY, offsetZ] = getOffsetPixel(buffer, rayCaster.scale);
        const {sMat} = rayCaster;
        const m3 = sMat[3];
        const m7 = sMat[7];
        const m11 = sMat[11];
        const m15 = sMat[15];

        offsetX *= scaleX;
        offsetY *= scaleY;
        offsetZ *= scaleZ;

        for (let i = 0, {length} = position; i < length; i += offset) {
            const x = tileX + position[i] * scaleXY + offsetX;
            const y = tileY + position[i + 1] * scaleXY + offsetY;
            const z = (size == 3 ? -decodeUint16z(position[i + 2]) : 0) - offsetZ;
            const scaleDZ = 1 + (scaleByAltitude ? 0 : z * m11 / (m3 * x + m7 * y + m15));
            const w = (point[i] >> 1) * scaleX * scaleDZ;
            const h = (point[i + 1] >> 1) * scaleY * scaleDZ;
            const d = (point[i + 2] >> 1) * scaleZ * scaleDZ; // pixel

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
