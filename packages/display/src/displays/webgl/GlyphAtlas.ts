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
    private ctx: CanvasRenderingContext2D;
    private x: number;
    private y: number;
    private orgW: number;
    private orgH: number;
    private ax = 0;
    private ay = 0;
    private style: FontStyle;
    private marginX = 0; // 2;
    private marginY = 0; // 2;

    scale: number;
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    letterHeight: number;
    glyphInfos: { [glyph: string]: GlyphInfo } = {};
    baselineOffset: number;
    avgCharWidth: number = 0;
    spaceWidth: number;
    length: number = 0;
    private rowHeight: number;
    glyphs: number = 0;

    font;

    constructor(
        style: FontStyle,
        dpr: number,
        size?: number,
        text?: string
    ) {
        const scale = dpr;
        let optimizedSize = 0;

        if (size) {
            optimizedSize = size;
        } else {
            size = 128;
        }


        this.font = glyphManager.initFont(style, dpr);


        const letterHeight = this.font.letterHeight;
        const letterHeightBottom = this.font.letterHeightBottom;
        const rowHeight = this.font.rowHeight;

        this.scale = scale;
        this.style = style;
        this.letterHeight = letterHeight;
        // this.baselineOffset = 0; // top
        // this.baselineOffset = (letterHeight - letterHeightBottom); // bottom
        this.baselineOffset = (letterHeight - letterHeightBottom) / 2 + this.font.paddingY; // middle
        this.baselineOffset *= scale;

        this.style = style;

        this.x = this.marginX;
        this.y = this.marginY;


        if (!optimizedSize) {
            let height = rowHeight / scale;
            // find optimal size for glyph packing
            for (let size2 = 64, minLoss = Infinity; size2 <= 256; size2 *= 2) {
                let loss = size2 / height % 1;
                if (size2 > height && loss < minLoss) {
                    optimizedSize = size2;
                    minLoss = loss;
                }
            }
        }

        this.rowHeight = rowHeight;

        size = optimizedSize * scale;

        this.width = size;
        this.height = size;

        this.orgW = size;
        this.orgH = size;

        this.spaceWidth = this.font.spaceWidth;

        if (text) {
            this.addChars(text);
        }
    };

    getTextWidth(text: string): number {
        return glyphManager.getTextWidth(text, this.font);
    }

    extendSize() {
        let {width, height, orgW, orgH, ax, ay} = this;
        let aw = width / orgW - 1;
        let ah = height / orgH - 1;

        if (ax < aw) {
            ax++;
        } else if (ay < ah) {
            const i = aw / 2 ^ 0;

            if (ay < i) {
                ax -= i;
            } else {
                ax = 0;
            }
            ay++;
        } else {
            width *= 2;
            height *= 2;
            ax++;
            ay = 0;
        }

        this.ax = ax;
        this.ay = ay;
        this.width = width;
        this.height = height;

        // console.log('EXTENT ATLAS SIZE', _w, _h, '->', width, height);
    }

    addChars(text: string): boolean {
        const {glyphInfos, marginY, rowHeight, scale} = this;
        const orgW = this.orgW;
        const orgH = this.orgH;
        let maxHeight = orgH - rowHeight;

        let charOffsetX = (this.ax * orgW);
        let charOffsetY = (this.ay * orgH);
        let avgCharWidth = this.avgCharWidth;
        let added = false;
        let charWidth;

        // for (let i = 0, c, len = text.length; i < len; i++) {
        //     c = text.charAt(isRTL ? (len - 1 - i) : i);
        for (let c of text) {
            if (c != ' ' && !glyphInfos[c]) {
                let glyph = glyphManager.getGlyph(c, this.font);
                let code = c.charCodeAt(0);
                let w = glyph.data.width;

                charWidth = glyph.width;

                if (code) {
                    avgCharWidth = (avgCharWidth * this.length + charWidth) / ++this.length;

                    if (this.x + glyph.data.width > orgW) {
                        this.y += rowHeight;

                        if (this.y > maxHeight) {
                            this.extendSize();
                            this.y = this.marginY; // + this.paddingY;
                            charOffsetX = (this.ax * orgW);
                            charOffsetY = (this.ay * orgH);
                        }
                        this.x = this.marginX; // + this.paddingX;
                    }
                    added = true;

                    let x = (this.x + charOffsetX); // - paddingX;
                    let y = (this.y + charOffsetY);
                    let u2 = x + w;
                    let v1 = y;
                    let v2 = v1 + rowHeight;

                    u2 = Math.round(u2);

                    glyphInfos[c] = {
                        u1: Math.floor(x),
                        v1: v1,
                        u2: u2,
                        v2: v2,
                        glyph: glyph
                    };

                    this.glyphs++;

                    this.x += Math.round(glyph.data.width + this.marginX);
                }
            }
        }

        this.avgCharWidth = avgCharWidth;

        return added;
    }

    // hasSpace(text: string): boolean {
    //     const ctx = this.ctx;
    //     const width = this.width;
    //     let marginX = this.marginX;
    //     let marginY = this.marginY;
    //     let paddingX = this.paddingX;
    //     let paddingY = this.paddingY;
    //     let x = this.x;
    //     let y = this.y;
    //     let charWidth;
    //     const glyphInfos = this.glyphInfos;
    //     const rowHeight = this.letterHeight + marginY + 2 * paddingY;
    //     const lastRowY = this.height - rowHeight;
    //
    //     for (let c of text) {
    //         if (!glyphInfos[c]) {
    //             if (charWidth = ctx.measureText(c).width) {
    //                 if (x + charWidth > width) {
    //                     x = marginX;
    //                     y += rowHeight;
    //
    //                     if (y > lastRowY) {
    //                         return false;
    //                     }
    //                 }
    //                 x += charWidth + marginX + 2 * paddingX;
    //             }
    //         }
    //     }
    //
    //     return true;
    // }
}

export {GlyphAtlas};
