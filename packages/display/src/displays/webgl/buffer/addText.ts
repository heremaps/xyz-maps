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

import {createTextData, OFFSET_SCALE} from './createText';
import {GlyphAtlas} from '../GlyphAtlas';
import {FlexArray} from './templates/FlexArray';

const EXTENT_SCALE = 64;
const DEFAULT_LINE_WRAP = 14;

export const wrapText = (text: string, textWrap?: number): string[] => {
    textWrap = textWrap || DEFAULT_LINE_WRAP;

    const lines = [];
    let lineStartIndex = 0;
    let wrapIndex = -1;

    for (let i = 0, line, length = text.length, c, lineLength; i < length; i++) {
        c = text.charAt(i);
        lineLength = i - lineStartIndex;

        if (c == ' ') {
            wrapIndex = i;
        } else if (c == '\n') {
            // force line break
            lineLength = Infinity;
            wrapIndex = i;
        }

        if (lineLength >= textWrap) {
            if (lineStartIndex <= wrapIndex) {
                line = text.substring(lineStartIndex, wrapIndex);
                lineStartIndex = wrapIndex + 1;
                lines.push(line);
            }
        }
        if (i == length - 1) { // is last character
            if (lineStartIndex <= i) {
                line = text.substring(lineStartIndex, i + 1);
                lines.push(line);
            }
        }
    }
    return lines;
};

const addText = (
    text: string | string[],
    offsets: FlexArray,
    vertex: FlexArray,
    texcoord: FlexArray,
    glyphAtlas: GlyphAtlas,
    cx: number,
    cy: number,
    offsetX?: number,
    offsetY?: number,
    textWrap?: number,
    rotation = 0,
) => {
    const lines = typeof text == 'string'
        ? wrapText(text, textWrap)
        : text;

    const lineCnt = lines.length;
    const lineHeight = glyphAtlas.lineHeight;

    let ty = ((glyphAtlas.baselineOffset - offsetY) + (lineCnt - 1) * lineHeight * .5) * OFFSET_SCALE;

    cx *= EXTENT_SCALE;
    cy *= EXTENT_SCALE;

    for (let text of lines) {
        const i = vertex.length / 2;
        const textData = createTextData(text, glyphAtlas, rotation, offsets, texcoord);
        const tx = (textData.width * glyphAtlas.scale / 2 - offsetX) * OFFSET_SCALE;

        vertex.reserve(text.length * 12);

        for (let j = i, offsetData = offsets.data, vertexData = vertex.data, len = i + textData.count; j < len; j++) {
            offsetData[3 * j] -= tx;
            offsetData[3 * j + 1] -= ty;

            vertexData[2 * j] = cx;
            vertexData[2 * j + 1] = cy;
        }

        vertex.length += textData.count * 2;

        ty -= lineHeight * OFFSET_SCALE;
    }
};

export {addText};
