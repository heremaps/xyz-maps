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

import {createTextData, OFFSET_SCALE} from './createText';
import {GlyphAtlas} from '../GlyphAtlas';
import {FlexArray} from './templates/FlexArray';

const EXTENT_SCALE = 64;

const addText = (
    cx: number,
    cy: number,
    z: null | number,
    lines: string[],
    offsets: FlexArray,
    vertex: FlexArray,
    textureCoordinates: FlexArray,
    glyphAtlas: GlyphAtlas,
    rotationZ = 0,
    rotationY: number | undefined
) => {
    const lineCnt = lines.length;
    const lineHeight = glyphAtlas.lineHeight;

    let ty = (glyphAtlas.baselineOffset + (lineCnt - 1) * lineHeight * .5) * OFFSET_SCALE;

    // LSB defines visibility, visible by default
    cx = cx * EXTENT_SCALE << 1 | 1;
    cy = cy * EXTENT_SCALE << 1 | 1;

    // 10 bit rotation precision
    rotationZ = Math.round(rotationZ * 1024 / 360);

    const hasHeight = z !== null;
    let dim = 2;

    let dimOff = rotationY == undefined ? 2 : 3;
    // if (dimOff) {
    //     offsetData[i * dimOff + 2] = rotationY;
    // }

    if (hasHeight) {
        // normalize float meters to uint16 (0m ... +9000m)
        z = Math.round(z / 9000 * 0xffff);
        dim = 3;
    }


    let i = vertex.length / dim;

    for (let text of lines) {
        const textData = createTextData(text, glyphAtlas, offsets, textureCoordinates, rotationZ, rotationY);
        const tx = textData.width * glyphAtlas.scale / 2 * OFFSET_SCALE;
        const vertexCnt = textData.count * dim;

        vertex.reserve(vertexCnt);

        for (let offsetData = offsets.data, vertexData = vertex.data, len = i + vertexCnt / dim; i < len; i++) {
            offsetData[i * dimOff] -= tx;
            offsetData[i * dimOff + 1] -= ty;

            vertexData[i * dim] = cx;
            vertexData[i * dim + 1] = cy;

            if (hasHeight) {
                vertexData[i * dim + 2] = <number>z;
            }
        }

        vertex.length += vertexCnt;

        ty -= lineHeight * OFFSET_SCALE;
    }
};

export {addText};
