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

import {BufferStyle, FlexAttribute, GeometryBuffer} from '../GeometryBuffer';
import type {BufferUniforms, BufferAttributes, ConfigureBufferStyle} from '../GeometryBuffer';
import type {ResolvedBufferStyle} from '../BufferStyle';
import {FlexArray} from '../FlexArray';
import {Raycaster} from '../../Raycaster';

import {Attribute} from '../Attribute';
import {Expression} from '@here/xyz-maps-common';
import {PASS} from '../../RenderPass';
import {encodeBatchValue, getUnitBatchKey, getStrokeStyleKey} from '../batchKey';

const N_SCALE = 1.0 / 8192.0;

const toWorld = (value: number, meterToPixel: number, renderScale: number): number => {
    return meterToPixel > 0 ? value * meterToPixel : value / renderScale;
};

export type LineBufferStyle = ResolvedBufferStyle<'stroke' | 'strokeWidth' | 'strokeDasharray' | 'strokeDashimage' | 'unit'>;

export type LineBufferUniforms = BufferUniforms & {
    'u_fill'?: number[] | Float32Array;
    'u_strokeWidth'?: (number | Expression)[];
    'u_dashUnit'?: number[];
    'u_no_antialias'?: boolean;
};

export class LineBuffer extends GeometryBuffer {
    declare uniforms: LineBufferUniforms;
    declare attributes: GeometryBuffer['attributes'] & BufferAttributes<NonNullable<LineBuffer['flexAttributes']>>;
    declare configureStyle: ConfigureBufferStyle<LineBufferStyle>;

    static getGeometryKey(
        altitude: BufferStyle['altitude'],
        unit: string,
        offset: number,
        offsetUnit: string,
        lineCap: string,
        lineJoin: string,
        dashArray?: BufferStyle['strokeDasharray']
    ): string {
        let key = (altitude === 'terrain' ? 'TL' : altitude ? 'AL' : 'L')
            + getUnitBatchKey(unit) + ':' + offset + ':' + getUnitBatchKey(offsetUnit) + ':' +
            encodeBatchValue(lineCap) + encodeBatchValue(lineJoin);
        if (dashArray) {
            if (dashArray.pattern instanceof Expression) {
                key += 'D' + encodeBatchValue(dashArray.pattern.id());
            } else {
                for (let i = 0; i < dashArray.pattern.length; i++) {
                    key += encodeBatchValue(dashArray.pattern[i]) + encodeBatchValue(dashArray.units[i]);
                }
            }
        }
        return key;
    }

    static getDashImageBatchKey(src: string): string {
        return encodeBatchValue(src || undefined);
    }

    static getBatchKey(
        geometryKey: string, stateKey: string, strokeIdentity: string, width: number | string,
        hasDashes: boolean = false, dashImage?: string
    ): string {
        return getStrokeStyleKey(strokeIdentity, width, stateKey, geometryKey + (hasDashes ? this.getDashImageBatchKey(dashImage) : ''));
    }

    constructor(flat: boolean = true) {
        super(flat);

        if (!flat) {
            // disable culling
            this.cullFace(null);
        }

        this.flexAttributes = {
            // vertex
            a_position: {
                data: new FlexArray(Float32Array),
                size: flat ? 2 : 3
            },
            a_normal: {
                data: new FlexArray(Int16Array),
                size: 4
            },
            a_lengthSoFar: {
                data: new FlexArray(Float32Array),
                size: 1
            }
        };

        this.first = 0;
        // this.first = this.flexAttributes.a_position.data.length / this.flexAttributes.a_position.data.size;
    }

    setIdOffset(featureId: string | number) {
        this.assertConstructing();
        this.idOffsets?.push((this.flexAttributes.a_position as FlexAttribute).data.length, featureId);
    }

    protected configureTypeStyle(style: LineBufferStyle, meterToPixel: number, hasAlphaColor: boolean): void {
        if (style.strokeDasharray) {
            this.type = 'DashedLine';
            this.addUniform('u_dashUnit', [
                style.strokeDasharray.units[0] === 'm' ? meterToPixel : 0,
                style.strokeDasharray.units[1] === 'm' ? meterToPixel : 0
            ]);
        }
        this.addUniform('u_fill', style.stroke);
        this.addUniform('u_strokeWidth', [style.strokeWidth, style.unit === 'm' ? meterToPixel : 0]);
        this.addUniform('u_offset', [style.offsetX, style.offsetUnit === 'm' ? meterToPixel : 0]);
        this.addUniform('u_no_antialias', false);
        this.pass = PASS.ALPHA_COLOR;
        if (!this.isFlat() || style.strokeDasharray || hasAlphaColor) this.pass |= PASS.ALPHA_DEPTH;
        this.depth = this.blend = true;
    }

    protected configureOffsets(): void {}

    protected configureLighting(): void {}

    rayIntersects(buffer: GeometryBuffer, result, tileX: number, tileY: number, rayCaster: Raycaster): number | string {
        const {attributes} = buffer;
        let position = (attributes.a_position as Attribute).data;
        let normal = (attributes.a_normal as Attribute).data;
        let size = (attributes.a_position as Attribute).size;
        const t0 = [0, 0, 0];
        const t1 = [0, 0, 0];
        const t2 = [0, 0, 0];
        // const matrix = rayCaster.pMat;
        let rayOrigin = rayCaster.origin;
        let rayDirection = rayCaster.direction;
        // let feature;
        // const scaleX = 2 / rayCaster.w;
        // const scaleY = 2 / rayCaster.h;
        const strokeWidthUniform = <number[]>buffer.getUniform('u_strokeWidth');
        const offsetUniform = <number[]>buffer.getUniform('u_offset');
        const strokeWidth = 0.5 * toWorld(strokeWidthUniform[0], strokeWidthUniform[1], buffer.renderScale);
        const lineOffset = toWorld(offsetUniform[0], offsetUniform[1], buffer.renderScale);
        const scaleByAltitude = <boolean>buffer.getUniform('u_scaleByAltitude');

        let index;
        const referenceW = buffer.referenceW;

        for (let i = 0, n = 0; i < position.length; n += 12) {
            let nx0 = normal[n];
            let ny0 = normal[n + 1];
            const ox0 = (nx0 >> 1) * N_SCALE;
            const oy0 = (ny0 >> 1) * N_SCALE;

            const dx0 = (nx0 & 1) * 2 - 1;
            nx0 = dx0 * (nx0 >> 1) * N_SCALE;

            const dy0 = (ny0 & 1) * 2 - 1;
            ny0 = dy0 * (ny0 >> 1) * N_SCALE;

            let x0 = position[i++];
            let y0 = position[i++];
            let z0 = size == 3 ? position[i++] * rayCaster.exaggeration : 0;
            // convert normalized int16 to float meters (-500m ... +9000m)
            // z0 = (z0 - 32267.0) * 0.14496292001098665;
            let nx1 = normal[n + 4];
            let ny1 = normal[n + 5];
            const ox1 = (nx1 >> 1) * N_SCALE;
            const oy1 = (ny1 >> 1) * N_SCALE;

            const dx1 = (nx1 & 1) * 2 - 1;
            nx1 = dx1 * (nx1 >> 1) * N_SCALE;

            const dy1 = (ny1 & 1) * 2 - 1;
            ny1 = dy1 * (ny1 >> 1) * N_SCALE;


            let x1 = position[i++];
            let y1 = position[i++];
            let z1 = size == 3 ? position[i++] * rayCaster.exaggeration : 0;

            let nx2 = normal[n + 8];
            let ny2 = normal[n + 9];
            const ox2 = (nx2 >> 1) * N_SCALE;
            const oy2 = (ny2 >> 1) * N_SCALE;

            const dx2 = (nx2 & 1) * 2 - 1;
            nx2 = dx2 * (nx2 >> 1) * N_SCALE;

            const dy2 = (ny2 & 1) * 2 - 1;
            ny2 = dy2 * (ny2 >> 1) * N_SCALE;

            let x2 = position[i++];
            let y2 = position[i++];
            let z2 = size == 3 ? position[i++] * rayCaster.exaggeration : 0;


            const tileX0 = tileX + x0 - ox0 * lineOffset;
            const tileY0 = tileY + y0 - oy0 * lineOffset;
            const scaleDZ = rayCaster.getLocalAltitudeScale(tileX0, tileY0, z0, scaleByAltitude, referenceW);
            t0[0] = tileX0 + nx0 * strokeWidth * scaleDZ;
            t0[1] = tileY0 + ny0 * strokeWidth * scaleDZ;
            t0[2] = z0;

            const tileX1 = tileX + x1 - ox1 * lineOffset;
            const tileY1 = tileY + y1 - oy1 * lineOffset;
            t1[0] = tileX1 + nx1 * strokeWidth * scaleDZ;
            t1[1] = tileY1 + ny1 * strokeWidth * scaleDZ;
            t1[2] = z1;

            const tileX2 = tileX + x2 - ox2 * lineOffset;
            const tileY2 = tileY + y2 - oy2 * lineOffset;
            t2[0] = tileX2 + nx2 * strokeWidth * scaleDZ;
            t2[1] = tileY2 + ny2 * strokeWidth * scaleDZ;
            t2[2] = z2;

            let intersectRayLength = Raycaster.rayIntersectsTriangle(
                rayOrigin,
                rayDirection,
                t0, t1, t2
            );

            if (intersectRayLength != null) {
                if (intersectRayLength <= result.z) {
                    result.z = intersectRayLength;
                    index = i - size;
                }
            }
        }

        if (index != null) {
            for (let j = 0, {idOffsets} = buffer, {length} = idOffsets; j < length; j += 2) {
                if (index < idOffsets[j]) {
                    return result.id = idOffsets[j + 1];
                }
            }
        }
    }
}
