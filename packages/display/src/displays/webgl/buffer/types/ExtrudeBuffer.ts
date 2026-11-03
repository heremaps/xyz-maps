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

import {FlexAttribute, GeometryBuffer} from '../GeometryBuffer';
import type {BufferUniforms, BufferAttributes, ConfigureBufferStyle} from '../GeometryBuffer';
import type {ResolvedBufferStyle} from '../BufferStyle';
import {FlexArray} from '../FlexArray';
import {PolygonBuffer} from './PolygonBuffer';
import {PASS} from '../../RenderPass';


export type ExtrudeBufferStyle = ResolvedBufferStyle<'fill' | 'fillIntensity' | 'stroke'>;

export type ExtrudeBufferUniforms = BufferUniforms & {
    'u_fill'?: number[] | Float32Array;
    'u_fillIntensity'?: number;
    'u_strokePass'?: number;
    'u_stroke'?: number[] | Float32Array;
};

export class ExtrudeBuffer extends PolygonBuffer {
    declare uniforms: ExtrudeBufferUniforms;
    declare attributes: GeometryBuffer['attributes'] & BufferAttributes<NonNullable<ExtrudeBuffer['flexAttributes']>>;
    declare configureStyle: ConfigureBufferStyle<ExtrudeBufferStyle>;

    static getGeometryKey(): string {
        return 'E';
    }

    flexAttributes: {
        'a_position': FlexAttribute,
        'a_normal': FlexAttribute
    } | null;
    extrudeStrokeIndex: number[];

    constructor() {
        super(false, false);

        this.flexAttributes.a_normal = {
            data: new FlexArray(Int8Array),
            size: 2,
            normalized: true
        };

        this.light = 'defaultLight';
    }

    protected configureTypeStyle(style: ExtrudeBufferStyle, meterToPixel: number, hasAlphaColor: boolean): void {
        super.configureTypeStyle(style, meterToPixel, hasAlphaColor);
        this.addUniform('u_strokePass', 0);
        if (style.stroke) {
            const stroke = this.addDrawCmd(this.extrudeStrokeIndex, this.i32, GeometryBuffer.MODE_GL_LINES);
            stroke.uniforms = {u_strokePass: 1, u_stroke: style.stroke};
        }
        if (hasAlphaColor) this.pass |= PASS.ALPHA_DEPTH;
    }
}
