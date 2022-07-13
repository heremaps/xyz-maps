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

import {FlexAttribute, TemplateBuffer} from './TemplateBuffer';
import {FlexArray} from './FlexArray';
import {GeometryBuffer} from '../GeometryBuffer';
import {Raycaster} from '../../Raycaster';
import {transformMat4} from 'gl-matrix/vec3';

const extentScale = 32;

export const decodeUint16z = (z: number): number => {
    return z * 9000 / 0xffff;
};

export class PointBuffer extends TemplateBuffer {
    flexAttributes: {
        'a_position': FlexAttribute
    };

    constructor(flat: boolean = true) {
        super(flat);

        this.flexAttributes = {
            // vertex
            a_position: {
                data: new FlexArray(Uint16Array),
                size: flat ? 2 : 3
            }
        };

        this.first = 0;
        // this.first = this.flexAttributes.a_position.data.length / this.flexAttributes.a_position.data.size;
    }


    rayIntersects(buffer: GeometryBuffer, result: { z: number }, tileX: number, tileY: number, rayCaster: Raycaster): number | string {
        const {type, attributes} = buffer;
        let width;
        let height;

        if (type === 'Rect') {
            const size = buffer.getUniform('u_size');
            const sw = buffer.getUniform('u_strokeWidth') || 0;
            width = (size[0] + sw) * .5;
            height = (size[2] + sw) * .5;
        } else if (type == 'Circle') {
            width = height = buffer.getUniform('u_radius')[0];
        }

        let position = attributes.a_position.data;
        let size = attributes.a_position.size;
        const t0 = [0, 0, 0];
        const t1 = [0, 0, 0];
        const t2 = [0, 0, 0];

        const alignMap = <boolean>buffer.getUniform('u_alignMap');

        if (alignMap) {
            width /= rayCaster.scale;
            height /= rayCaster.scale;
        }

        let rayOrigin;
        let rayDirection;
        let bufferIndex = null;

        let intersectionPoint;
        if (alignMap) {
            rayOrigin = rayCaster.origin;
            rayDirection = rayCaster.direction;
        } else {
            intersectionPoint = [0, 0, 0];
        }


        for (let i = 0, y = 0; i < position.length; i += size, y += 6) {
            let dx0 = (position[i] & 2) - 1;
            let x0 = tileX + (position[i] >> 2) / extentScale;
            let dy0 = (position[i + 1] & 2) - 1;
            let y0 = tileY + (position[i + 1] >> 2) / extentScale;

            // let z0 = size == 3 ? -position[i + 2] : 0;
            let z0 = size == 3 ? -decodeUint16z(position[i + 2]) : 0;
            // convert normalized int16 to float meters (-500m ... +9000m)
            // z0 = (z0 - 32267.0) * 0.14496292001098665;

            i += size;
            // if (z0 == 0) continue;

            let dx1 = (position[i] & 2) - 1;
            let x1 = tileX + (position[i] >> 2) / extentScale;
            let dy1 = (position[i + 1] & 2) - 1;
            let y1 = tileY + (position[i + 1] >> 2) / extentScale;
            // let z1 = size == 3 ? -position[i + 2] : 0;
            let z1 = size == 3 ? -decodeUint16z(position[i + 2]) : 0;

            i += size;

            let dx2 = (position[i] & 2) - 1;
            let x2 = tileX + (position[i] >> 2) / extentScale;
            let dy2 = (position[i + 1] & 2) - 1;
            let y2 = tileY + (position[i + 1] >> 2) / extentScale;
            // let z2 = size == 3 ? -position[i + 2] : 0;
            let z2 = size == 3 ? -decodeUint16z(position[i + 2]) : 0;

            if (type === 'Icon') {
                let point = attributes.a_size?.data;
                // const [scaleWidth, scaleHeight] = rayCaster.getInverseScale(true);
                // width = point[y] / 2 * scaleWidth;
                // height = point[y + 1] / 2 * scaleHeight;
                width = point[y] * .5;
                height = point[y + 1] * .5;
            }
            // console.log('icon', width, height);
            if (alignMap) {
                t0[0] = x0 + dx0 * width;
                t0[1] = y0 - dy0 * height;
                t0[2] = z0;

                t1[0] = x1 + dx1 * width;
                t1[1] = y1 - dy1 * height;
                t1[2] = z1;

                t2[0] = x2 + dx2 * width;
                t2[1] = y2 - dy2 * height;
                t2[2] = z2;
            } else {
                t0[0] = x0;
                t0[1] = y0;
                t0[2] = z0;

                // transformMat4(t0, t0, rayCaster.sMat);
                // t1[0] = t0[0] + dx1 * width;
                // t1[1] = t0[1] - dy1 * height;
                // t1[2] = t0[2];
                //
                // t2[0] = t0[0] + dx2 * width;
                // t2[1] = t0[1] - dy2 * height;
                // t2[2] = t0[2];
                //
                // t0[0] += dx0 * width;
                // t0[1] -= dy0 * height;
                //
                // transformMat4(t0, t0, rayCaster.iSMat);
                // transformMat4(t1, t1, rayCaster.iSMat);
                // transformMat4(t2, t2, rayCaster.iSMat);
                // rayOrigin = rayCaster.origin;
                // rayDirection = rayCaster.direction;


                transformMat4(t0, t0, rayCaster.sMat);

                t1[0] = t0[0] + dx1 * width;
                t1[1] = t0[1] - dy1 * height;
                t1[2] = t0[2];

                t2[0] = t0[0] + dx2 * width;
                t2[1] = t0[1] - dy2 * height;
                t2[2] = t0[2];

                t0[0] += dx0 * width;
                t0[1] -= dy0 * height;

                rayOrigin = rayCaster.sOrigin;
                rayDirection = rayCaster.sDirection;
            }


            let intersectRayLength = Raycaster.rayIntersectsTriangle(
                rayOrigin,
                rayDirection,
                t0, t1, t2,
                intersectionPoint
            );

            if (intersectRayLength) {
                if (!alignMap) {
                    intersectRayLength = rayCaster.rayLengthScreenToWorld(intersectionPoint);
                }

                if (intersectRayLength < result.z) {
                    result.z = intersectRayLength;
                    bufferIndex = i;
                }
            }
        }

        if (bufferIndex != null) {
            return buffer.idOffsets[Math.floor(bufferIndex / 18)];
        }
    }
}
