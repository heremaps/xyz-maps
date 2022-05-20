/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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

import {TemplateBuffer} from './TemplateBuffer';
import {FlexArray} from './FlexArray';

export class TextBuffer extends TemplateBuffer {
    constructor(flat: boolean = true, rotY?: boolean) {
        super(flat);

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
}
