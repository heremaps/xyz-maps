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
import {GlyphTexture} from '../../GlyphTexture';
import {addText} from '../addText';
import {GlyphAtlas} from '../../GlyphAtlas';

export class TextBuffer extends TemplateBuffer {
    uniforms: {
        u_texture: GlyphTexture
    };

    flexAttributes: {
        'a_position': FlexAttribute,
        'a_point': FlexAttribute
        'a_texcoord': FlexAttribute
    };
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
                size: flat ? 2 : 3
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
