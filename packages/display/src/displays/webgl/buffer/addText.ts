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
import {ParsedStyleProperty, TextStyle} from '@here/xyz-maps-core';

type TextAnchors = ParsedStyleProperty<TextStyle['textAnchor']>;

const ANCHOR_OFFSET: Record<TextAnchors, { x: number, y: number }> = {
    Center: {x: .5, y: 0},
    Left: {x: 0, y: 0},
    Right: {x: 1, y: 0},
    Top: {x: .5, y: -1},
    TopLeft: {x: 0., y: -1},
    TopRight: {x: 1, y: -1},
    Bottom: {x: .5, y: 1},
    BottomLeft: {x: 0, y: 1},
    BottomRight: {x: 1, y: 1}
};

const addText = (
    cx: number,
    cy: number,
    z: null | number,
    positionPrecisionScale: number,
    lines: string[],
    offsets: FlexArray,
    vertex: FlexArray,
    textureCoordinates: FlexArray,
    glyphAtlas: GlyphAtlas,
    rotationZ = 0,
    rotationY: number | undefined,
    textAnchor: ParsedStyleProperty<TextStyle['textAnchor']> | string = 'Center',
    hide?: boolean
) => {
    const lineOffset = lines.length - 1;
    const lineHeight = glyphAtlas.lineHeight;
    const anchorOffset = ANCHOR_OFFSET[textAnchor] || ANCHOR_OFFSET.Center;
    // let ty = glyphAtlas.baselineOffset + lineHeight * lineOffset * .5;
    // ty += lineHeight * lines.length * anchorOffset.y * .5;
    let ty = glyphAtlas.baselineOffset + 0.5 * lineHeight * (lineOffset + lines.length * anchorOffset.y);
    ty *= OFFSET_SCALE;

    const visible: number = hide === undefined ? 1 : Number(!hide);

    // LSB defines visibility, visible by default
    cx = (cx * positionPrecisionScale) << 1 | visible;
    cy = (cy * positionPrecisionScale) << 1 | visible;

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
        const vertexCnt = textData.count * dim;
        const tx = textData.width * anchorOffset.x * OFFSET_SCALE;

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
