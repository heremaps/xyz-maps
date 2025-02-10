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

import {FlexAttribute} from './TemplateBuffer';
import {FlexArray} from './FlexArray';
import {PointBuffer} from './PointBuffer';
import {addIcon} from '../addIcon';
import {ImageInfo} from '../../Atlas';

export class SymbolBuffer extends PointBuffer {
    flexAttributes: {
        'a_position': FlexAttribute,
        'a_size': FlexAttribute,
        'a_texcoord': FlexAttribute
    };

    constructor(flat: boolean = true, tileSize: number) {
        super(flat, tileSize);
        this.flexAttributes = {
            //  MSB                           LSB
            // |VX|...|VX|directionX|    visible|
            // |VY|...|VY|directionY|metaDataBit|
            a_position: {
                data: new FlexArray(Uint16Array),
                size: flat ? 2 : 3
            },
            a_size: {
                data: new FlexArray(Uint8Array),
                size: 2
            },
            // Rotation is 9 bit in total.
            // lower 8 bits are stored in texture coordinates. MSB is stored in vertex coordinates metaDataBit.
            // bit0 -> bit3  - rotation low (x), rotation height (y)
            // bit4 -> bit15 - texture coordinate
            // 8 bit rotation, 2 * 12 bit texture coordinate (4096x4096)
            //  MSB                                                              LSB
            // |TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|ROTL|ROTL|ROTL|ROTL|
            // |TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|ROTH|ROTH|ROTH|ROTH|
            a_texcoord: {
                data: new FlexArray(Uint16Array),
                size: 2
            }
        };

        this.first = 0;
        // this.first = this.flexAttributes.a_position.data.length / this.flexAttributes.a_position.data.size;
    }

    addIcon(x: number, y: number, z: number, img: ImageInfo, width: number, height: number, rotationZ?: number, hide?: boolean) {
        const {normalizePosition, flexAttributes} = this;
        addIcon(
            x,
            y,
            z,
            normalizePosition,
            <ImageInfo>img,
            width,
            height,
            flexAttributes.a_size.data,
            flexAttributes.a_position.data,
            flexAttributes.a_texcoord.data,
            rotationZ
            // !!this.collisionGroup
        );
    }
}
