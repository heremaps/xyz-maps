/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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
    constructor() {
        super(false);

        this.attributes = {
            // vertex
            a_position: {
                data: new FlexArray(Int16Array),
                size: 2
            },
            // point
            a_point: {
                data: new FlexArray(Int16Array),
                size: 2
            },
            // bit1 -> bit5  - rotation low [bit1 defines visibility] (x), rotation height (y)
            // bit6 -> bit16 - texture coordinate
            // 1bit visibility, 9 bit rotation, 2 * 11 bit texture coordinate
            // |VISI|ROTL|ROTL|ROTL|ROTL|TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|TCX|
            // |ROTH|ROTH|ROTH|ROTH|ROTH|TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|TCY|
            a_texcoord: {
                data: new FlexArray(Uint16Array),
                size: 2
            }
        };

        this.first = 0;
        // this.first = this.attributes.a_position.data.length / this.attributes.a_position.data.size;
    }
}
