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

const isArabic = (text: string) => {
    const cc = text.charCodeAt(0);
    //            arabic                            Arabic Supplement
    return (cc >= 0x0600 && cc <= 0x06ff) || (cc >= 0x0750 && cc <= 0x077F);
};


export const createTextData = (text: string, fontInfo: GlyphAtlas, positions?, texcoords?) => {
    const {spacing, spaceWidth, letterHeight} = fontInfo;
    const len = text.length;
    let y = letterHeight;
    let x = 0;
    let x2 = 0;
    let u1;
    let v1;
    let u2;
    let v2;
    let glyph;
    let offset;

    if (!positions) {
        positions = new Float32Array(len * 12);
        texcoords = new Float32Array(len * 12);
        offset = 0;
    } else {
        offset = positions.length;
    }

    // let c;
    // const u, arabic = false; //isArabic(text);
    // for (let i = 0; i < len; i++) {
    //     c = text.charAt(arabic?(len-1-i):i);
    for (let c of text) {
        glyph = fontInfo.glyphInfos[c];

        if (glyph) {
            y = glyph.height;

            x2 = x + glyph.width;
            u1 = (glyph.x);
            v1 = (glyph.y + glyph.height);
            // v1 = (glyph.y + letterHeight - 1) / maxY;
            u2 = (glyph.x + glyph.width);
            v2 = glyph.y;

            // if(arabic){
            //     u = u1;
            //     u1 = u2;
            //     u2 = u;
            // }

            // 6 vertices per letter
            positions[offset + 0] = x;
            positions[offset + 1] = 0;

            texcoords[offset + 0] = u1;
            texcoords[offset + 1] = v2;

            positions[offset + 2] = x2;
            positions[offset + 3] = y;

            texcoords[offset + 2] = u2;
            texcoords[offset + 3] = v1;

            positions[offset + 4] = x;
            positions[offset + 5] = y;

            texcoords[offset + 4] = u1;
            texcoords[offset + 5] = v1;

            positions[offset + 6] = x2;
            positions[offset + 7] = 0;

            texcoords[offset + 6] = u2;
            texcoords[offset + 7] = v2;

            positions[offset + 8] = x2;
            positions[offset + 9] = y;

            texcoords[offset + 8] = u2;
            texcoords[offset + 9] = v1;

            positions[offset + 10] = x;
            positions[offset + 11] = 0;

            texcoords[offset + 10] = u1;
            texcoords[offset + 11] = v2;


            x += glyph.width - spacing;

            offset += 12;
        } else {
            x += spaceWidth;
        }
    }

    return {
        position: new positions.constructor(positions.buffer, 0, offset),
        texcoord: new texcoords.constructor(texcoords.buffer, 0, offset),
        // position: positions,
        // texcoord: texcoords,
        numVertices: offset / 2,
        width: x2 / fontInfo.scale,
        height: letterHeight
    };
};
