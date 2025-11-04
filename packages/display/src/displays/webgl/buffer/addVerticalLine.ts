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

import {VerticalLineBuffer} from './templates/VerticalLineBuffer';


const addVerticalLine = (
    group,
    x: number,
    y: number,
    z: number | 'terrain'
): number => {
    if (z) {
        let buffer = group.buffer;
        if (!buffer) {
            buffer = group.buffer = new VerticalLineBuffer();
            buffer.setRequiresHeightMap(z === 'terrain');
        }
        const position = buffer.flexAttributes.a_position.data;

        if (buffer.requiresHeightMap) {
            z = 1.0;
        }

        position.push(
            x, y, 0,
            x, y, z
        );
        return position.length;
    }
};

export {addVerticalLine};
