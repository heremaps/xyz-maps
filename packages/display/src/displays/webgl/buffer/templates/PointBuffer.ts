/*
 * Copyright (C) 2019-2023 HERE Europe B.V.
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
import {GeometryBuffer, Uniform} from '../GeometryBuffer';
import {Raycaster} from '../../Raycaster';
import {transformMat4} from 'gl-matrix/vec3';
import {Attribute} from '../Attribute';
import {vec3} from '@here/xyz-maps-common';
import {addPoint} from '../addPoint';

const extentScale = 32;

export const decodeUint16z = (z: number): number => {
    return z * 9000 / 0xffff;
};

const toPixelOffset = (offset: number, scaleMeter: number, scale: number) => {
    if (scaleMeter > 0.0) {
        // offset is defined in meters -> convert to pixels at current zoom
        return offset * scaleMeter * scale;
    }
    return offset;
};

export const getOffsetPixel = (buffer: GeometryBuffer, scale: number, scaleZ?: number) => {
    const uOffset = <number[]>buffer.getUniform('u_offset');
    const offsetX = toPixelOffset(uOffset[0], uOffset[1], scale);
    const offsetY = toPixelOffset(uOffset[2], uOffset[3], scale);

    const uOffsetZ = <number[]>buffer.getUniform('u_offsetZ');
    const offsetZ = toPixelOffset(uOffsetZ[0], uOffsetZ[1], scale);

    // if (offsetZUnit) {
    //     // value is defined in meters -> convert to pixels at current zoom
    //     offsetZ *= scale * offsetZUnit;
    // }
    // return [offsetX, offsetY, offsetZ / scaleZ / scale];
    return [offsetX, offsetY, offsetZ];
};


export class PointBuffer extends TemplateBuffer {
    flexAttributes: {
        'a_position': FlexAttribute
    };

    uniforms: {
        u_normalizePosition: number;
        [name: string]: Uniform
    };

    protected normalizePosition: number;

    constructor(flat: boolean = true, tileSize?: number) {
        super(flat, false);

        this.flexAttributes = {
            // vertex
            a_position: {
                data: new FlexArray(Uint16Array),
                size: flat ? 2 : 3,
                // Marked as dynamic since collision detection may modify LSB of the x component to indicate visibility
                dynamic: true
            }
        };

        if (tileSize) {
            // 14-bit position precision
            this.normalizePosition = 16384 / tileSize;

            this.addUniform('u_normalizePosition', 1 / this.normalizePosition);
        }


        this.first = 0;
        // this.first = this.flexAttributes.a_position.data.length / this.flexAttributes.a_position.data.size;
    }

    addPoint(x: number, y: number, z: number, hide?: boolean) {
        addPoint(x, y, z, this.normalizePosition, this.flexAttributes.a_position.data);
    }

    rayIntersects(buffer: GeometryBuffer, result: { z: number }, tileX: number, tileY: number, rayCaster: Raycaster): number | string {
        const {type, attributes} = buffer;
        const alignMap = <boolean>buffer.getUniform('u_alignMap');
        const scaleByAltitude = <boolean>buffer.getUniform('u_scaleByAltitude');
        const {scale, scaleZ, sMat} = rayCaster;

        // const invRenderScale = 1 / buffer.renderScale;
        let scaleXYZ = alignMap
            ? rayCaster.getInverseWorldScale(buffer.renderScale) // world scale
            // : [1 / buffer.renderScale, 1 / buffer.renderScale, 1]; // screen scale
            : [1, 1, 1]; // screen scale

        const invMapScale = alignMap ? 1 / buffer.renderScale : 1;
        let width;
        let height;
        let [offsetX, offsetY, offsetZ] = getOffsetPixel(buffer, scale);

        offsetX *= scaleXYZ[0];
        offsetY *= scaleXYZ[1];
        offsetZ *= scaleXYZ[2];

        if (type === 'Rect') {
            const size = buffer.getUniform('u_size');
            const sw = buffer.getUniform('u_strokeWidth') || 0;
            width = (size[0] + sw) * .5;
            height = (size[2] + sw) * .5;
        } else if (type == 'Circle') {
            width = height = buffer.getUniform('u_radius')[0];
        }

        width *= scaleXYZ[0];
        height *= scaleXYZ[1];

        const positionAttribute = (attributes.a_position as Attribute);
        const position = positionAttribute.data;
        const size = positionAttribute.size;
        const t0 = [0, 0, 0];
        const t1 = [0, 0, 0];
        let intersectionPoint;
        let rayOrigin;
        let rayDirection;
        let screenMatrix;
        let bufferIndex = null;
        let renderScale = 1;

        if (alignMap) {
            rayOrigin = rayCaster.origin;
            rayDirection = rayCaster.direction;
        } else {
            intersectionPoint = [0, 0, 0];
            screenMatrix = rayCaster.sMat;
            renderScale = buffer.renderScale / scale;
            rayOrigin = rayCaster.sOrigin;
            rayDirection = rayCaster.sDirection;
        }
        // tileScale combines renderScale (screen-space scaling) and extentScale (tile coordinate normalization).
        // renderScale only affects screen-space rendering (u_alignMap == false).
        // In world-space mode, geometry uses map units directly, so renderScale is not applied.
        const tileScale = renderScale / extentScale;
        const m3 = sMat[3];
        const m7 = sMat[7];
        const m11 = sMat[11];
        const m15 = sMat[15];

        const stride = 6 * size;

        for (let i = 0, y = 0; i < position.length; i += stride, y += 6) {
            let x0 = tileX + (position[i] >> 2) * tileScale;
            let y0 = tileY + (position[i + 1] >> 2) * tileScale;
            // convert normalized int16 to float meters (-500m ... +9000m)
            // z0 = (z0 - 32267.0) * 0.14496292001098665;
            let z0 = size == 3 ? decodeUint16z(position[i + 2]) : 0;
            let dx0 = (position[i] & 2) - 1;
            let dy0 = (position[i + 1] & 2) - 1;

            let j = i + 2 * size;
            let dx1 = (position[j] & 2) - 1;
            let dy1 = (position[j + 1] & 2) - 1;

            if (type === 'Icon') {
                let point = (attributes.a_size as Attribute)?.data;
                width = point[y] * .5 * invMapScale;
                height = point[y + 1] * .5 * invMapScale;
            }

            if (alignMap) {
                // position world feature center
                t0[0] = t1[0] = x0 + offsetX;
                t0[1] = t1[1] = y0 + offsetY;
                t0[2] = t1[2] = z0 + offsetZ;

                const scaleDZ = 1 + (scaleByAltitude ? 0 : t0[2] * m11 / (m3 * t0[0] + m7 * t0[1] + m15));
                const w = width * scaleDZ;
                const h = height * scaleDZ;

                t0[0] += dx0 * w;
                t0[1] -= dy0 * h;

                t1[0] += dx1 * w;
                t1[1] -= dy1 * h;
            } else {
                t0[0] = x0;
                t0[1] = y0;
                t0[2] = z0 + offsetZ;

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

                transformMat4(t0, t0, screenMatrix);

                t0[0] += offsetX;
                t0[1] += offsetY;

                t1[0] = t0[0] + dx1 * width;
                t1[1] = t0[1] - dy1 * height;
                t1[2] = t0[2];

                t0[0] += dx0 * width;
                t0[1] -= dy0 * height;
            }

            let intersectRayLength = rayCaster.intersectAABBox(
                t0[0], t0[1], t0[2],
                t1[0], t1[1], t1[2],
                rayOrigin,
                rayDirection
            );

            if (intersectRayLength) {
                if (!alignMap) {
                    vec3.add(intersectionPoint, rayOrigin, vec3.scale(intersectionPoint, rayDirection, intersectRayLength));
                    intersectRayLength = rayCaster.rayLengthScreenToWorld(intersectionPoint);
                }

                if (intersectRayLength < result.z) {
                    result.z = intersectRayLength;
                    bufferIndex = i;
                }
            }
        }

        if (bufferIndex != null) {
            return buffer.idOffsets[Math.floor(bufferIndex / stride)];
        }
    }
}
