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

import {GlyphAtlas} from '../GlyphAtlas';
import {isDigit} from '../unicode';
import {FlexArray} from './templates/FlexArray';

const SPACE_CHAR = ' ';
const LEFT_TO_RIGHT = 1;
const RIGHT_TO_LEFT = -1;

export const OFFSET_SCALE = 32;

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

type TextData = { x: number; boxWidth: number; offset: number; textWidth: number }

const addGlyph = (c: string, glyphAtlas: GlyphAtlas, rotationZ: number, rotationY: number | undefined, positions: FlexArray, texcoords: FlexArray, data: TextData) => {
    let {offset, x} = data;
    let {spaceWidth} = glyphAtlas;
    let glyphInfo = glyphAtlas.glyphInfos[c];
    let x2 = 0;

    const positionData = positions.data;
    const hasRotY = rotationY != undefined;

    let p = positions.length;
    const texcoordData = texcoords.data;
    let t = texcoords.length;
    let rotationHi = rotationZ >> 5;
    let rotationLow = (rotationZ & 31);
    let glyphWidth = 0;

    if (glyphInfo) {
        // let {u1, v1, u2, v2, glyph} = glyphInfo;
        let {glyph} = glyphInfo;
        let u1 = glyphInfo.u1 << 5 | rotationLow;
        let u2 = glyphInfo.u2 << 5 | rotationLow;
        let v1 = glyphInfo.v1 << 5 | rotationHi;
        let v2 = glyphInfo.v2 << 5 | rotationHi;
        let {advanceX} = glyph;
        glyphWidth = glyph.width;

        let {width, height} = glyph.data;

        x2 = x + width;

        const scaledX = x * OFFSET_SCALE;
        const scaledX2 = x2 * OFFSET_SCALE;

        height *= OFFSET_SCALE;

        positionData[p++] = scaledX;
        positionData[p++] = 0;

        if (hasRotY) {
            positionData[p++] = rotationY;
        }

        positionData[p++] = scaledX2;
        positionData[p++] = height;

        if (hasRotY) {
            positionData[p++] = rotationY;
        }

        positionData[p++] = scaledX;
        positionData[p++] = height;

        if (hasRotY) {
            positionData[p++] = rotationY;
        }

        positionData[p++] = scaledX2;
        positionData[p++] = 0;

        if (hasRotY) {
            positionData[p++] = rotationY;
        }

        positionData[p++] = scaledX2;
        positionData[p++] = height;

        if (hasRotY) {
            positionData[p++] = rotationY;
        }

        positionData[p++] = scaledX;
        positionData[p++] = 0;

        if (hasRotY) {
            positionData[p++] = rotationY;
        }

        texcoordData[t++] = u1;
        texcoordData[t++] = v1;

        texcoordData[t++] = u2;
        texcoordData[t++] = v2;

        texcoordData[t++] = u1;
        texcoordData[t++] = v2;

        texcoordData[t++] = u2;
        texcoordData[t++] = v1;

        texcoordData[t++] = u2;
        texcoordData[t++] = v2;

        texcoordData[t++] = u1;
        texcoordData[t++] = v1;

        x += advanceX;
        offset += 12;
    } else if (c == ' ') {
        x += spaceWidth;
    }

    positions.length = p;
    texcoords.length = t;

    data.x = x;
    data.offset = offset;
    data.boxWidth = x2;
    data.textWidth += glyphWidth;
};

const addText = (
    text: string,
    start: number,
    stop: number,
    isRTL: boolean,
    glyphAtlas: GlyphAtlas,
    rotationZ: number,
    rotationY: number | undefined,
    positions: FlexArray,
    texcoords: FlexArray,
    txtData: TextData
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
                            addGlyph(text.charAt(k), glyphAtlas, rotationZ, rotationY, positions, texcoords, txtData);
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
        addGlyph(c, glyphAtlas, rotationZ, rotationY, positions, texcoords, txtData);
    }
};

export const createTextData = (
    text: string,
    glyphAtlas: GlyphAtlas,
    positions: FlexArray,
    texcoords: FlexArray,
    rotationZ: number = 0,
    rotationY?: undefined | number
) => {
    const len = text.length;

    // if (!positions) {
    //     positions = new FlexArray(Int16Array, len * 18);
    // } else {
    positions.reserve(len * 18);
    // }
    //
    // if (!texcoords) {
    //     texcoords = new FlexArray(Uint16Array, len * 12);
    // } else {
    texcoords.reserve(len * 12);
    // }


    if (rotationY) {
        rotationY = 32767 * rotationY / (2 * Math.PI) ^ 0;
    }


    const txtData: TextData = {
        x: 0,
        boxWidth: 0,
        offset: 0,
        textWidth: 0
    };
    let baseDirection;
    let prevDirection;
    let startIndex = 0;
    let prevChar;

    rotationZ = Math.round(rotationZ);

    // BIDI text is considered as experimental and has known issues
    for (let i = 0; i < len; i++) {
        let char = text.charAt(i);
        let glyphInfo = glyphAtlas.glyphInfos[char];
        let isLast = i == len - 1;
        let curDirection = 0;
        const glyph = glyphInfo?.glyph;
        if (glyph) {
            curDirection = glyph.direction; // -1,0,+1
        }

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
                addText(text, startIndex, end, prevDirection == RIGHT_TO_LEFT, glyphAtlas, rotationZ, rotationY, positions, texcoords, txtData);
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

            addText(text, startIndex, end, rtl, glyphAtlas, rotationZ, rotationY, positions, texcoords, txtData);
        }

        if (curDirection) {
            prevDirection = curDirection;
        }
        prevChar = char;
    }
    return {
        count: txtData.offset / 2,
        position: positions.data,
        texcoord: texcoords.data,
        width: txtData.boxWidth
    };
};
