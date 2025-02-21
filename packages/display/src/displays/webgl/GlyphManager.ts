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
import {getDirection} from './unicode';
import {FontStyle} from './GlyphTexture';
import {initFont, determineFontHeight, drawCharacter} from '../textUtils';

const DEFAULT_STROKE_WIDTH = 1;
const DEFAULT_FONT = 'normal 12px Arial';
const DEFAULT_TEXT_ALIGN = 'start';

const GLYPH_FILL = '#fff';
const GLYPH_STROKE = '#000';

export const createCanvas = (width: number, height: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

export type Glyph = {
    width: number;
    char: string,
    data: ImageData,
    advanceX: number;
    direction: number; // 1(LTR)|0(NEUTRAL)|-1(RTL)
}

type Font = {
    canvas: HTMLCanvasElement;
    textMetricsCache: Map<string, TextMetrics>;
    ctx: CanvasRenderingContext2D;
    scale: number;
    glyphs: Map<string, Glyph>;
    baselineOffset: number;
    paddingX: number;
    offsetX: number;
    size: number;
    name: string;
    width: number;
    style: FontStyle;
    letterHeight: number;
    letterHeightBottom: number;
    spaceWidth: number;
    paddingY: number;
    rowHeight: number
};

class GlyphManager {
    private fonts: { [id: string]: Font } = {};

    static instance: GlyphManager;

    static getInstance() {
        return this.instance = this.instance || new GlyphManager();
    }

    constructor() {

    }

    private getFontId(style: FontStyle, scale: number) {
        return `${style.font || DEFAULT_FONT}${style.strokeWidth || DEFAULT_STROKE_WIDTH}${scale}`;
        // return `${style.font || DEFAULT_FONT}${style.strokeWidth || DEFAULT_STROKE_WIDTH}${style.textAlign || DEFAULT_TEXT_ALIGN}${scale}`;
    }

    initFont(style: FontStyle, scale: number = 1): Font {
        const {fonts} = this;
        const styleId = this.getFontId(style, scale);

        if (!fonts[styleId]) {
            const size = 96 * scale;
            const canvas = createCanvas(size, size);
            const ctx = canvas.getContext('2d', {willReadFrequently: true});

            ctx.textBaseline = 'bottom';
            const letterHeightBottom = determineFontHeight(ctx, style, 'gM').height;

            ctx.textBaseline = 'top';
            const letterHeight = determineFontHeight(ctx, style, 'gM').height;

            initFont(ctx, style, GLYPH_FILL, GLYPH_STROKE);

            // determine font height on scaled canvas is less precise
            // so we determine unscaled and scale afterwards
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
            // ctx.textAlign = 'start'; // 'center'
            // ctx.textBaseline = 'top'; // 'middle'

            const {lineWidth} = ctx;
            const paddingX = Math.ceil(lineWidth/2);
            const paddingY = Math.ceil(lineWidth/2);
            const rowHeight = (letterHeight + 2 * paddingY);

            fonts[styleId] = {
                name: styleId,
                size: 0,
                glyphs: new Map<string, Glyph>(),
                paddingX,
                paddingY,
                canvas,
                ctx,
                width: size,
                offsetX: 2 * lineWidth * scale,
                scale,
                style,
                textMetricsCache: new Map<string, TextMetrics>(),
                rowHeight: rowHeight * scale,
                letterHeightBottom: letterHeightBottom,
                letterHeight: letterHeight,
                spaceWidth: ctx.measureText(' ').width * scale,
                baselineOffset: scale * ((letterHeight - letterHeightBottom) / 2 + paddingY) // middle
                // this.baselineOffset = 0; // top
                // this.baselineOffset = (letterHeight - letterHeightBottom); // bottom
            };
        }
        return fonts[styleId];
    }

    hasGlyph(char: string, font) {
        return font.glyphs.has(char);
    }

    getGlyph(char: string, font: Font): Glyph {
        let glyph = font.glyphs.get(char);

        if (!glyph) {
            let size = font.canvas.width;
            let {ctx, scale, paddingX} = font;

            ctx.clearRect(0, 0, size, size);

            drawCharacter(ctx, char, paddingX, font.paddingY, font.style);

            let metrics = font.textMetricsCache.get(char);

            if (!metrics) {
                metrics = ctx.measureText(char);
            } else {
                font.textMetricsCache.delete(char);
            }

            const {width} = metrics;
            const imgWidth = Math.round(width + 2 * paddingX) * scale;

            // ---- debug only ----
            // let lw = font.ctx.lineWidth;
            // font.ctx.lineWidth = 2;
            // font.ctx.strokeStyle = 'black';
            // font.ctx.strokeRect(0, 0, imgWidth, font.rowHeight / scale);
            // font.ctx.lineWidth = lw;
            // font.ctx.strokeStyle = GLYPH_STROKE;

            const imgData = ctx.getImageData(0, 0, imgWidth, font.rowHeight);

            // ---- debug only ----
            // (function(imgData, width, height) {
            //     const canvas = createCanvas(width, height);
            //     canvas.getContext('2d').putImageData(imgData, 0, 0);
            //     const img = document.createElement('img');
            //     img.src = canvas.toDataURL('image/png');
            //     document.body.appendChild(img);
            // })(imgData, imgWidth, font.rowHeight);

            glyph = {
                // metrics,
                char: char,
                width,
                data: imgData,
                direction: getDirection(char.charCodeAt(0)),
                advanceX: width * scale
            };

            font.glyphs.set(char, glyph);
            font.size++;
        }

        return glyph;
    }

    getTextWidth(text: string, font) {
        const {ctx} = font;
        let width = 0;
        for (let char of text) {
            let glyph = font.glyphs.get(char);
            if (glyph) {
                width += glyph.width;
            } else {
                let metrics = font.textMetricsCache.get(char);
                if (!metrics) {
                    metrics = ctx.measureText(char);
                    font.textMetricsCache.set(char, metrics);
                }
                width += metrics.width;
            }
        }
        return width;
    }
}

export {GlyphManager};
