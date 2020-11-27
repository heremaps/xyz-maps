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

import {GlyphAtlas} from '../GlyphAtlas';

import {TypedArray, TypedArrayConstructor} from './glType';
import {isDigit} from '../unicode';

const SPACE_CHAR = ' ';
const LEFT_TO_RIGHT = 1;
const RIGHT_TO_LEFT = -1;

const findNextDir = (text, i, glyphAtlas) => {
    while (++i < text.length) {
        let char = text.charAt(i);
        let glyph = glyphAtlas.glyphInfos[char]?.glyph;
        if (glyph) {
            let {direction} = glyph;
            if (direction) {
                return direction;
            }
        }
    }
};

type TextData = { x: number; x2: number; offset: number; }

const addGlyph = (c: string, glyphAtlas: GlyphAtlas, positions: TypedArray, texcoords: TypedArray, data: TextData) => {
    let {x, offset} = data;
    let {spaceWidth} = glyphAtlas;
    let glyphInfo = glyphAtlas.glyphInfos[c];
    let x2 = 0;

    if (glyphInfo) {
        let {u1, v1, u2, v2, glyph} = glyphInfo;
        let {advanceX} = glyph;
        let {width, height} = glyph.data;

        x2 = x + width;

        // 6 vertices per letter
        positions[offset + 0] = x;
        positions[offset + 1] = 0;

        texcoords[offset + 0] = u1;
        texcoords[offset + 1] = v1;

        positions[offset + 2] = x2;
        positions[offset + 3] = height;

        texcoords[offset + 2] = u2;
        texcoords[offset + 3] = v2;

        positions[offset + 4] = x;
        positions[offset + 5] = height;

        texcoords[offset + 4] = u1;
        texcoords[offset + 5] = v2;

        positions[offset + 6] = x2;
        positions[offset + 7] = 0;

        texcoords[offset + 6] = u2;
        texcoords[offset + 7] = v1;

        positions[offset + 8] = x2;
        positions[offset + 9] = height;

        texcoords[offset + 8] = u2;
        texcoords[offset + 9] = v2;

        positions[offset + 10] = x;
        positions[offset + 11] = 0;

        texcoords[offset + 10] = u1;
        texcoords[offset + 11] = v1;

        x += advanceX;

        offset += 12;
    } else if (c == ' ') {
        x += spaceWidth;
    }

    data.x = x;
    data.offset = offset;
    data.x2 = x2;
};

const addText = (
    text: string,
    start: number,
    stop: number,
    isRTL: boolean,
    glyphAtlas: GlyphAtlas,
    positions: TypedArray,
    texcoords: TypedArray,
    txtData: TextData,
) => {
    for (let i = start, len = stop, j, c; i < len; i++) {
        j = isRTL ? start + (len - 1 - i) : i;
        c = text.charAt(j);
        // render numbers in reverse order inside RTL text blocks
        if (isRTL) {
            if (isDigit(text.charCodeAt(j))) {
                let k = j;
                let flipped = 0;
                while (--k >= 0) {
                    if (!isDigit(text.charCodeAt(k))) {
                        while (++k <= j) {
                            addGlyph(text.charAt(k), glyphAtlas, positions, texcoords, txtData);
                            flipped++;
                        }
                        break;
                    }
                }
                if (flipped) {
                    i += flipped - 1;
                    continue;
                }
            }
        }
        addGlyph(c, glyphAtlas, positions, texcoords, txtData);
    }
};

export const createTextData = (text: string, glyphAtlas: GlyphAtlas) => {
    const len = text.length;
    const positions = new Float32Array(len * 12);
    const texcoords = new Float32Array(len * 12);
    const txtData = {
        x: 0,
        x2: 0,
        offset: 0
    };
    let baseDirection;
    let prevDirection;
    let startIndex = 0;
    let prevChar;

    // BIDI text is considered as experimental and has known issues
    for (let i = 0; i < len; i++) {
        let char = text.charAt(i);
        let glyphInfo = glyphAtlas.glyphInfos[char];
        let isLast = i == len - 1;
        let curDirection = glyphInfo?.glyph?.direction || 0; // -1,0,+1

        if (!baseDirection) {
            if (char == ' ') { // neutral
                continue;
            }
            // neutral start -> LTR base direction
            curDirection = curDirection || 1;
            baseDirection = curDirection;
        }

        if (prevDirection !== undefined) {
            let flip = true;
            if (!curDirection) {
                let nextDir = findNextDir(text, i, glyphAtlas);
                flip = nextDir && nextDir != prevDirection;
            }
            // if (!curDirection){}else
            if (flip && curDirection != prevDirection) {
                let end = i - 1;
                if (prevChar == SPACE_CHAR) {
                    if (curDirection == LEFT_TO_RIGHT) {
                        end--;
                    }
                }
                end++;
                addText(text, startIndex, end, prevDirection == RIGHT_TO_LEFT, glyphAtlas, positions, texcoords, txtData);
                startIndex = end;
            }
        }

        if (isLast && startIndex <= i) {
            // cut last white char
            let end = i + Number(char != ' ');
            let rtl;
            if (curDirection) {
                rtl = curDirection == -1;
            } else {
                // neutral -> take previous direction
                rtl = prevDirection != baseDirection;
            }

            addText(text, startIndex, end, rtl, glyphAtlas, positions, texcoords, txtData);
        }

        if (curDirection) {
            prevDirection = curDirection;
        }
        prevChar = char;
    }

    const {offset, x2} = txtData;

    return {
        position: new (<TypedArrayConstructor>positions.constructor)(positions.buffer, 0, offset),
        texcoord: new (<TypedArrayConstructor>texcoords.constructor)(texcoords.buffer, 0, offset),
        numVertices: offset / 2,
        width: x2 / glyphAtlas.scale,
        height: glyphAtlas.letterHeight
    };
};
