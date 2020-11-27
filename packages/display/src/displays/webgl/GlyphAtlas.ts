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
import {Glyph, GlyphManager} from './GlyphManager';
import {FontStyle} from './GlyphTexture';

let glyphManager = GlyphManager.getInstance();

type GlyphInfo = {
    v1: number;
    v2: number;
    u1: number;
    u2: number;
    glyph: Glyph;
}

class GlyphAtlas {
    private x: number = 0;
    private y: number = 0;
    private style: FontStyle;
    private rowHeight: number;

    scale: number;
    width: number;
    height: number;
    letterHeight: number;
    glyphInfos: { [glyph: string]: GlyphInfo } = {};
    baselineOffset: number;
    avgCharWidth: number = 0;
    spaceWidth: number;
    glyphs: number = 0;
    maxWidth;
    maxHeight;
    font;

    constructor(
        style: FontStyle,
        devicePixelRation: number,
        size?: number,
        text?: string
    ) {
        const font = glyphManager.initFont(style, devicePixelRation);

        this.style = style;
        this.letterHeight = font.letterHeight;
        this.baselineOffset = font.baselineOffset;
        this.rowHeight = font.rowHeight;
        this.spaceWidth = font.spaceWidth;

        // size = 64;
        // while (size < rowHeight) size *= 2;
        size = 64 * devicePixelRation;

        this.width = size;
        this.height = size;
        this.maxWidth = size;
        this.maxHeight = size;

        this.style = style;
        this.scale = devicePixelRation;
        this.font = font;

        if (text) {
            this.addChars(text);
        }
    };

    getTextWidth(text: string): number {
        return glyphManager.getTextWidth(text, this.font);
    }

    private placeGlyph(glyph) {
        const {rowHeight} = this;

        let maxX = this.x + glyph.data.width;
        // if(c=='n')debugger;

        if (maxX > this.width) {
            this.y += rowHeight;

            let maxY = this.y + glyph.data.height;

            if (maxY > this.maxHeight) {
                if (maxY > this.height) {
                    this.y = 0;
                    this.x = this.width;

                    this.maxWidth = this.width;
                    // debugger;
                    this.height *= 2;
                    this.width *= 2;
                    // this.maxHeight =
                } else {
                    // 2
                    // debugger
                    if (maxX >= this.height) {
                        this.x = 0;
                        this.maxHeight = this.height;
                    } else {
                        this.x = this.maxWidth;
                    }
                    // this.x = maxX >= this.height ? 0: this.maxWidth;
                }
            } else {
                if (maxY <= this.height) {
                    this.x = this.maxWidth == this.width ? 0 : this.maxWidth;
                } else {
                    this.x = 0;
                    // this.maxWidth = this.width;
                    // this.maxHeight = this.height;
                }
                this.maxWidth = this.width;
                this.maxHeight = this.height;
            }
        }
    }

    addChars(text: string): boolean {
        const {glyphInfos, rowHeight} = this;
        let added = false;

        // for (let i = 0, c, len = text.length; i < len; i++) {
        //     c = text.charAt(isRTL ? (len - 1 - i) : i);
        for (let c of text) {
            if (c != ' ' && !glyphInfos[c]) {
                let glyph = glyphManager.getGlyph(c, this.font);
                let code = c.charCodeAt(0);
                let glyphWidth = glyph.data.width;
                let charWidth = glyph.width;

                if (code) {
                    this.avgCharWidth = (this.avgCharWidth * this.glyphs + charWidth) / ++this.glyphs;

                    added = true;

                    this.placeGlyph(glyph);

                    const {x, y} = this;

                    glyphInfos[c] = {
                        u1: x,
                        v1: y,
                        u2: x + glyphWidth,
                        v2: y + rowHeight,
                        glyph: glyph
                    };

                    this.x += glyphWidth;
                }
            }
        }

        return added;
    }
}

export {GlyphAtlas};
