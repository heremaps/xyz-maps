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

import {FlexArray} from './FlexArray';
import {FlexAttribute} from './TemplateBuffer';
import {BoxBuffer, extentScale} from './BoxBuffer';
import {GeometryBuffer} from '../GeometryBuffer';
import {Raycaster, Vec3} from '../../Raycaster';
import {decodeUint16z, getOffsetPixel} from './PointBuffer';
import {BACK} from '../glType';
import {Attribute} from '../Attribute';

const SPHERE_VERTICES = 1056;

const scaleXY = 1 / extentScale;

export class SphereBuffer extends BoxBuffer {
    flexAttributes: {
        'a_position': FlexAttribute,
        'a_point': FlexAttribute
        'a_normal'?: FlexAttribute
    };

    constructor(flat: boolean = true) {
        super(false);

        this.cullFace = BACK;

        this.flexAttributes.a_point = {
            normalized: true,
            data: new FlexArray(Uint8Array),
            size: 3
        };
    }

    rayIntersects(buffer: GeometryBuffer, result: { z: number }, tileX: number, tileY: number, rayCaster: Raycaster): number | string {
        const {attributes} = buffer;
        const position = (attributes.a_position as Attribute).data;
        const size = (attributes.a_position as Attribute).size;
        const alignMap = true;

        const [scaleX, scaleY, scaleZ] = rayCaster.getInverseScale(alignMap);
        const [r] = <number[]>buffer.uniforms.u_radius;
        const radius: Vec3 = [r * scaleX, r * scaleY, r * scaleZ];

        let [offsetX, offsetY, offsetZ] = getOffsetPixel(buffer, rayCaster.scale);

        offsetX *= scaleX;
        offsetY *= scaleY;
        offsetZ *= scaleZ;

        let index = null;
        const offset = size * SPHERE_VERTICES;
        const sphereCenter: Vec3 = [0, 0, 0];

        for (let i = 0, {length} = position; i < length; i += offset) {
            sphereCenter[0] = tileX + position[i] * scaleXY + offsetX;
            sphereCenter[1] = tileY + position[i + 1] * scaleXY + offsetY;
            sphereCenter[2] = (size == 3 ? -decodeUint16z(position[i + 2]) : 0) - offsetZ;
            // Because the projection is already transforming from meter to pixel along the z-axis,
            // the sphere is technically an ellipse.
            // const intersectRayLength = intersectEllipsoid(rayCaster.origin, rayCaster.direction, sphereCenter, radius);
            const intersectRayLength = rayCaster.intersectEllipsoid(sphereCenter, radius);

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
