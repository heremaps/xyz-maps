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
import {SimpleArray} from './templates/FlexArray';

export const addPoint = (
    x: number,
    y: number,
    z: number | boolean,
    normalizePositionFactor: number,
    vertex: SimpleArray<number>,
    metadataBit?: 0|1
    // hide?: boolean
): number => {
    // const visible: number = hide === undefined ? 1 : Number(!hide);
    const visible = 1;
    let v = vertex.length;

    // make room for direction vector bit1 and visibility bit0 (LSB)
    x = (x * normalizePositionFactor) << 2 | (visible & 0x03);
    y = (y * normalizePositionFactor) << 2 | (metadataBit & 0x03);

    //   0 ------ 1
    //   | `.     |
    //   |   `.   |
    //   |     `. |
    //   2 ------ 3

    const x0 = x; // left
    const y0 = y; // up

    const x1 = x | 2; // right
    const y1 = y0; // up

    const x2 = x0; // left
    const y2 = y | 2; // down

    const x3 = x1; // right
    const y3 = y2; // down


    if (typeof z == 'number') {
        // z = Math.round(z);
        // normalize float meters to uint16 (0m ... +9000m)
        z = Math.round( z / 9000 * 0xffff );

        vertex.push(
            // 0 -> 2 -> 3
            x0, y0, z,
            x2, y2, z,
            x3, y3, z,
            // 0 -> 3 -> 1
            x0, y0, z,
            x3, y3, z,
            x1, y1, z
        );
        v += 18;
    } else {
        vertex.push(
            // 0 -> 2 -> 3
            x0, y0,
            x2, y2,
            x3, y3,
            // 0 -> 3 -> 1
            x0, y0,
            x3, y3,
            x1, y1
        );
        v += 12;
    }

    return v;
};
