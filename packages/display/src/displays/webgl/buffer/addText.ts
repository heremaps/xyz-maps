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
import {TextStyle} from '@here/xyz-maps-core';

const EXTENT_SCALE = 64;

const ANCHOR_OFFSET: Record<TextStyle['textAnchor'], { x: number, y: number }> = {
    Center: {x: .5, y: 1},
    Left: {x: 0, y: 1},
    Right: {x: 1, y: 1},
    Top: {x: .5, y: 0},
    TopLeft: {x: 0, y: 0},
    TopRight: {x: 1, y: 0},
    Bottom: {x: .5, y: 2},
    BottomLeft: {x: 0, y: 2},
    BottomRight: {x: 1, y: 2}
};

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
    rotationY: number | undefined,
    textAnchor: TextStyle['textAnchor'] | string = 'Center'
) => {
    const lineOffset = lines.length - 1;
    const lineHeight = glyphAtlas.lineHeight;
    const anchorOffset = ANCHOR_OFFSET[textAnchor] || ANCHOR_OFFSET.Center;
    let ty = (glyphAtlas.baselineOffset + lineHeight * lineOffset * .5) * OFFSET_SCALE * anchorOffset.y;

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
        const tx = textData.width * anchorOffset.x * glyphAtlas.scale * OFFSET_SCALE;
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
