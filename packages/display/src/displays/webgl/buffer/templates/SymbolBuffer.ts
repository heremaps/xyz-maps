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
import {PointBuffer} from './PointBuffer';

export class SymbolBuffer extends PointBuffer {
    flexAttributes: {
        'a_position': FlexAttribute,
        'a_size': FlexAttribute,
        'a_texcoord': FlexAttribute
    };

    constructor(flat: boolean = true) {
        super(flat);
        this.flexAttributes = {
            a_position: {
                data: new FlexArray(Uint16Array),
                size: flat ? 2 : 3
            },
            a_size: {
                data: new FlexArray(Uint8Array),
                size: 2
            },
            // bit1 -> bit5  - rotation low (x), rotation height (y)
            // bit6 -> bit16 - texture coordinate
            // 10 bit rotation, 2 * 11 bit texture coordinate (2048x2048)
            //  MSB                                                              LSB
            // |TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|ROTL|ROTL|ROTL|ROTL|ROTL|
            // |TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|ROTH|ROTH|ROTH|ROTH|ROTH|
            a_texcoord: {
                data: new FlexArray(Uint16Array),
                size: 2
            }
        };

        this.first = 0;
        // this.first = this.flexAttributes.a_position.data.length / this.flexAttributes.a_position.data.size;
    }
}
