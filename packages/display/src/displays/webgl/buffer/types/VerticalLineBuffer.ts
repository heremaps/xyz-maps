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

import {PolygonBuffer} from './PolygonBuffer';
import {GeometryBuffer} from '../GeometryBuffer';
import type {BufferUniforms, BufferAttributes, ConfigureBufferStyle} from '../GeometryBuffer';
import type {ResolvedBufferStyle} from '../BufferStyle';
import {Raycaster} from '../../Raycaster';
import {encodeBatchValue, getStrokeStyleKey} from '../batchKey';

export type VerticalLineBufferStyle = ResolvedBufferStyle<'stroke'>;

export type VerticalLineBufferUniforms = BufferUniforms & {
    'u_fill'?: number[] | Float32Array;
    'u_fillIntensity'?: number;
};

export class VerticalLineBuffer extends PolygonBuffer {
    declare uniforms: VerticalLineBufferUniforms;
    declare attributes: GeometryBuffer['attributes'] & BufferAttributes<NonNullable<VerticalLineBuffer['flexAttributes']>>;
    declare configureStyle: ConfigureBufferStyle<VerticalLineBufferStyle>;

    static getGeometryKey(offsetZ?: number | string): string {
        return 'VL' + encodeBatchValue(offsetZ);
    }

    static getBatchKey(geometryKey: string, stateKey: string, strokeIdentity: string, width: number | string): string {
        return getStrokeStyleKey(strokeIdentity, width, stateKey, geometryKey);
    }

    constructor(flat: boolean = false, clip: boolean = true) {
        super(flat, clip);
        this.flat = false;
    }

    protected configureTypeStyle(style: VerticalLineBufferStyle, meterToPixel: number): void {
        this.addUniform('u_fill', style.stroke);
        this.addUniform('u_offsetZ', [style.offsetZ, style.offsetUnit === 'm' ? meterToPixel : 0]);
    }

    rayIntersects(buffer: GeometryBuffer, result: { z: number }, tileX: number, tileY: number, rayCaster: Raycaster): number | string {
        return null;
    }
}
