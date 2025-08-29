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

import {extentScale} from './templates/BoxBuffer';
import {FlexArray, SimpleArray} from './templates/FlexArray';

export const addBox = (
    x: number,
    y: number,
    z: number | boolean,
    width: number,
    height: number,
    depth: number,
    vertex: FlexArray,
    points: SimpleArray<number>,
    normal?: SimpleArray<number>
    // rotation: number = 0
) => {
    x *= extentScale;
    y *= extentScale;

    // 6 vertices per face, 6 faces
    const vertexCount = 36;

    if (typeof z == 'number') {
        // normalize float meters to uint16 (0m ... +9000m)
        z = Math.round(z / 9000 * 0xffff);
        vertex.reserve(3 * vertexCount);
        for (let i = 0; i < vertexCount; i++) {
            vertex.data[vertex.length++] = x;
            vertex.data[vertex.length++] = y;
            vertex.data[vertex.length++] = z;
        }
    } else {
        vertex.reserve(2 * vertexCount);
        for (let i = 0; i < vertexCount; i++) {
            vertex.data[vertex.length++] = x;
            vertex.data[vertex.length++] = y;
        }
    }

    points.push(
        // FRONT
        width | 0, height | 1, depth | 1,
        width | 1, height | 1, depth | 1,
        width | 0, height | 1, depth | 0,
        width | 0, height | 1, depth | 0,
        width | 1, height | 1, depth | 1,
        width | 1, height | 1, depth | 0,
        // BACK
        width | 0, height | 0, depth | 0,
        width | 1, height | 0, depth | 1,
        width | 0, height | 0, depth | 1,
        width | 1, height | 0, depth | 0,
        width | 1, height | 0, depth | 1,
        width | 0, height | 0, depth | 0,
        // LEFT
        width | 0, height | 1, depth | 0,
        width | 0, height | 0, depth | 0,
        width | 0, height | 1, depth | 1,
        width | 0, height | 0, depth | 0,
        width | 0, height | 0, depth | 1,
        width | 0, height | 1, depth | 1,
        // RIGHT
        width | 1, height | 1, depth | 0,
        width | 1, height | 1, depth | 1,
        width | 1, height | 0, depth | 0,
        width | 1, height | 0, depth | 0,
        width | 1, height | 1, depth | 1,
        width | 1, height | 0, depth | 1,
        // TOP
        //   0 ------ 1
        //   | `.     |
        //   |   `.   |
        //   |     `. |
        //   2 ------ 3
        width | 0, height | 0, depth | 1, // 0
        width | 1, height | 1, depth | 1, // 3
        width | 0, height | 1, depth | 1, // 2
        width | 0, height | 0, depth | 1, // 0
        width | 1, height | 0, depth | 1, // 1
        width | 1, height | 1, depth | 1, // 3

        // BOTTOM
        width | 0, height | 0, depth | 0, // 0
        width | 1, height | 1, depth | 0, // 3
        width | 0, height | 1, depth | 0, // 2
        width | 0, height | 0, depth | 0, // 0
        width | 1, height | 0, depth | 0, // 1
        width | 1, height | 1, depth | 0 // 3

    );


    if (normal) {
        normal.push(
            0, 1, 0, // front
            0, 1, 0, // front
            0, 1, 0, // front
            0, 1, 0, // front
            0, 1, 0, // front
            0, 1, 0, // front
            0, -1, 0, // back
            0, -1, 0, // back
            0, -1, 0, // back
            0, -1, 0, // back
            0, -1, 0, // back
            0, -1, 0, // back
            -1, 0, 0, // left
            -1, 0, 0, // left
            -1, 0, 0, // left
            -1, 0, 0, // left
            -1, 0, 0, // left
            -1, 0, 0, // left
            1, 0, 0, // right
            1, 0, 0, // right
            1, 0, 0, // right
            1, 0, 0, // right
            1, 0, 0, // right
            1, 0, 0, // right
            0, 0, 1, // top
            0, 0, 1, // top
            0, 0, 1, // top
            0, 0, 1, // top
            0, 0, 1, // top
            0, 0, 1, // top
            0, 0, -1, // bottom
            0, 0, -1, // bottom
            0, 0, -1, // bottom
            0, 0, -1, // bottom
            0, 0, -1, // bottom
            0, 0, -1 // bottom
        );
    }
};
