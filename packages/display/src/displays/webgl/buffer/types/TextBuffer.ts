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

import {BufferStyle, FlexAttribute, GeometryBuffer} from '../GeometryBuffer';
import type {BufferUniforms, BufferAttributes, ConfigureBufferStyle} from '../GeometryBuffer';
import type {ResolvedBufferStyle} from '../BufferStyle';
import {FlexArray} from '../FlexArray';
import {FontStyle, GlyphTexture} from '../../GlyphTexture';
import {addText} from '../geometry/addText';
import {GlyphAtlas} from '../../GlyphAtlas';
import {Expression} from '@here/xyz-maps-common';
import type {GraphicsDevice} from '../../device/GraphicsDevice';
import {encodeBatchValue} from '../batchKey';
import {PointBuffer} from './PointBuffer';

export type TextBufferStyle = ResolvedBufferStyle<'fill' | 'stroke' | 'strokeWidth' | 'font'>;

export type TextBufferUniforms = BufferUniforms & {
    'u_texture'?: GlyphTexture;
    'u_normalizePosition'?: number;
    'u_fillColor'?: number[] | Float32Array;
    'u_strokeColor'?: number[] | Float32Array;
    'u_texSize'?: number[];
};

export class TextBuffer extends GeometryBuffer {
    static getGeometryKey(font: string): string {
        return 'T' + encodeBatchValue(font || '*');
    }

    static getBatchKey = PointBuffer.getPointBatchKey;

    static createGlyphTexture(device: GraphicsDevice, style: Partial<Pick<BufferStyle, 'font' | 'strokeWidth' | 'fill' | 'stroke'>>): GlyphTexture {
        if (!this.isFontStyle(style)) throw new TypeError('Glyph textures require resolved text colors and stroke width.');
        return new GlyphTexture(device, style);
    }

    private static isFontStyle(
        style: Partial<Pick<BufferStyle, 'font' | 'strokeWidth' | 'fill' | 'stroke'>>
    ): style is Partial<BufferStyle> & FontStyle {
        return !(style.strokeWidth instanceof Expression) && (!style.fill || !('stops' in style.fill));
    }

    isPointGeometry = true;
    anchoredPixelSize = true;
    declare uniforms: TextBufferUniforms;
    declare attributes: GeometryBuffer['attributes'] & BufferAttributes<NonNullable<TextBuffer['flexAttributes']>>;
    declare configureStyle: ConfigureBufferStyle<TextBufferStyle>;

    flexAttributes: {
        'a_position': FlexAttribute,
        'a_point': FlexAttribute
        'a_texcoord': FlexAttribute
    } | null;
    private normalizePosition: number;

    constructor(flat: boolean = true, tileSize: number, rotY?: boolean) {
        super(flat);

        // 15-bit position precision
        this.normalizePosition = 32768 / tileSize;
        this.addUniform('u_normalizePosition', 1 / this.normalizePosition);

        this.flexAttributes = {
            // LSB x,y defines visibility -> 14bit position precision (use LSB:x only to increase to 15bit)
            a_position: {
                data: new FlexArray(Uint16Array),
                size: flat ? 2 : 3,
                // Marked as dynamic since collision detection may modify LSB of the x component to indicate visibility
                dynamic: true
            },
            a_point: {
                data: new FlexArray(Int16Array),
                // 16 bit used for rotationY
                size: rotY ? 3 : 2
            },
            // bit1 -> bit5  - rotation low  (x), rotation height (y)
            // bit6 -> bit16 - texture coordinate
            // 10 bit rotation, 2 * 11 bit texture coordinate
            //  MSB                                                              LSB
            // |TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|ROTL|ROTL|ROTL|ROTL|ROTL|
            // |TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|ROTH|ROTH|ROTH|ROTH|ROTH|
            a_texcoord: {
                data: new FlexArray(Uint16Array),
                size: 2
            }
        };

        this.first = 0;
    }

    protected configureTypeStyle(style: TextBufferStyle): void {
        this.uniforms.u_texture.sync();
        this.addUniform('u_fillColor', GeometryBuffer.getFillColor(style.fill) || TextBuffer.COLOR_UNDEFINED);
        this.addUniform('u_strokeColor', style.stroke || TextBuffer.COLOR_UNDEFINED);
        this.configureTextureStyle(style, this.uniforms.u_texture);
    }

    addText(
        x: number,
        y: number,
        z: number,
        lines: string[],
        fontInfo: GlyphAtlas,
        rotationZ: number,
        rotationY: number,
        textAnchor: string
    ) {
        this.assertConstructing();
        const {flexAttributes} = this;
        addText(
            x,
            y,
            z,
            this.normalizePosition,
            lines,
            flexAttributes.a_point.data,
            flexAttributes.a_position.data,
            flexAttributes.a_texcoord.data,
            fontInfo,
            rotationZ,
            rotationY,
            textAnchor
            // !!this.collisionGroup
        );
    }
}
