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
import {isNeutralDirection, isRTL, isDigit} from './unicode';

const DEFAULT_STROKE_WIDTH = 1;
const DEFAULT_FONT = 'normal 12px Arial';
const DEFAULT_TEXT_ALIGN = 'start';

const GLYPH_FILL = '#ff0000';
const GLYPH_STROKE = '#00ff00';

const getDirection = (cc: number): number => {
    return (isNeutralDirection(cc) || isDigit(cc)) ? 0 : isRTL(cc) ? -1 : 1;
};


type FontStyle = {
    font?: string;
    textAlign?: string;
    strokeWidth?: number;
    stroke?: string;
    fill?: string;
}

export const initFont = (ctx, style: FontStyle, fill = GLYPH_FILL, stroke = GLYPH_STROKE) => {
    ctx.font = style.font || DEFAULT_FONT;

    if (typeof style.strokeWidth == 'number') {
        ctx.lineWidth = style.strokeWidth;
    } else {
        ctx.lineWidth = DEFAULT_STROKE_WIDTH;
    }

    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.textAlign = style.textAlign || DEFAULT_TEXT_ALIGN;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
};

export const drawCharacter = (ctx: CanvasRenderingContext2D, c: string, x: number, y: number, style) => {
    const fill = style.fill;
    const stroke = style.stroke;
    const strokeWidth = style.strokeWidth;

    if (stroke && strokeWidth != 0) {
        ctx.strokeText(c, x, y);
    }
    if (fill) {
        ctx.fillText(c, x, y);
    }
};

const determineFontHeight = (ctx: CanvasRenderingContext2D, style: FontStyle, text: string, width?: number, height?: number) => {
    width = width || 128;
    height = height || 128;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    initFont(ctx, style, '#fff', '#fff');

    // ctx.strokeStyle = '#fff';
    // ctx.fillStyle = '#fff';

    // ctx.textBaseline = 'top';

    drawCharacter(ctx, text, 0, 0, style);

    const pixels = ctx.getImageData(0, 0, width, height).data;
    let start = -1;
    let end = -1;

    for (let row = 0; row < height; row++) {
        for (let column = 0; column < width; column++) {
            let index = (row * width + column) * 4;
            if (pixels[index] == 0) {
                if (column == width - 1 && start !== -1) {
                    end = row;
                    row = height;
                    break;
                }
                continue;
            } else {
                if (start == -1) {
                    start = row;
                }
                break;
            }
        }
    }

    ctx.clearRect(0, 0, width, height);

    return {
        height: end - start,
        min: start,
        max: end
    };
};

export const createCanvas = (width: number, height: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};


let _canvas = document.createElement('canvas');
let _ctx = _canvas.getContext('2d');

const flipAndCopyCanvas = (canvas, x, y, w, h) => {
    _canvas.width = w;
    _canvas.height = h;
    _ctx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

    const tmpCanvas = _canvas;

    _ctx = canvas.getContext('2d');
    _canvas = canvas;

    return tmpCanvas;
};

type GlyphInfo = {
    v1: number;
    v2: number;
    u1: number;
    u2: number;
    width: number;
    height: number;
    dir: number; // 1|0|-1
}
let fontHeightCache = new Map<string, [number, number]>();

class GlyphAtlas {
    private ctx: CanvasRenderingContext2D;
    private x: number;
    private y: number;
    private orgW: number;
    private orgH: number;
    private ax = 0;
    private ay = 0;
    private style: FontStyle;
    private avgGlyphHeight: number;
    private marginX = 2;
    private marginY = 2;
    // using padding will lead to lost context on some systems (driverbug?!)
    // padding -> char overlapping -> depth test related issue in combination with gl.LEQUAL!
    // using gl.LESS for depth test works fine with padding.
    private paddingX = 0;
    private paddingY = 2;

    scale: number;
    spacing;
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
            size = 64;
        }

        size *= scale;

        const canvas = createCanvas(size, size);
        const ctx = (canvas).getContext('2d');
        const styleId = (style.strokeWidth || DEFAULT_STROKE_WIDTH) + (style.font || DEFAULT_FONT) + (style.textAlign || DEFAULT_TEXT_ALIGN);
        const fontHeightInfo = fontHeightCache.get(styleId);

        let letterHeightBottom;
        let letterHeight;

        this.scale = scale;

        if (fontHeightInfo) {
            letterHeightBottom = fontHeightInfo[0];
            letterHeight = fontHeightInfo[1];
            ctx.textBaseline = 'top';
        } else {
            ctx.textBaseline = 'bottom';
            letterHeightBottom = determineFontHeight(ctx, style, 'gM').height * scale;

            ctx.textBaseline = 'top';
            letterHeight = determineFontHeight(ctx, style, 'gM').height * scale;

            fontHeightCache.set(styleId, [letterHeightBottom, letterHeight]);
        }


        this.avgGlyphHeight = letterHeight;
        this.style = style;

        let sw = style.strokeWidth ^ 0;

        // this.spacing = 13.5*this.paddingX;
        // this.spacing = sw + this.paddingX * 3;

        this.spacing = sw * 1.25; //* 1.05;
        this.paddingX += this.spacing / 2;
        this.paddingY += sw * .5;

        const rowHeight = letterHeight / scale + this.marginY + 2 * this.paddingY;
        this.rowHeight = rowHeight;
        this.letterHeight = letterHeight;
        // this.baselineOffset = 0; // top
        // this.baselineOffset = (letterHeight - letterHeightBottom); // bottom
        this.baselineOffset = (letterHeight - letterHeightBottom) / 2 + this.paddingY; // middle

        this.canvas = canvas;
        this.ctx = ctx;
        this.style = style;

        this.x = this.marginX + this.paddingX;
        this.y = this.marginY + this.paddingY;


        if (!optimizedSize) {
            // find optimal size for glyph packing
            for (let size2 = 64, minLoss = Infinity; size2 <= 256; size2 *= 2) {
                let loss = size2 / rowHeight % 1;
                if (size2 > rowHeight && loss < minLoss) {
                    optimizedSize = size2;
                    minLoss = loss;
                }
            }
        }

        size = optimizedSize * scale;
        canvas.width = size;
        canvas.height = size;
        // determine font height on scaled canvas is less precise
        // so we determine unscaled and scale afterwards
        ctx.transform(scale, 0, 0, scale, 0, 0);
        ctx.textBaseline = 'top';

        this.width = size;
        this.height = size;

        this.orgW = size;
        this.orgH = size;

        initFont(ctx, style);

        this.spaceWidth = (ctx.measureText(' ').width * scale);

        if (text) {
            this.addChars(text);
        }
    };

    getTextWidth(text: string) {
        const {ctx} = this;
        // 2x linewidth is roughly estimated but good enough
        return ctx.measureText(text).width + 2 * ctx.lineWidth;
    }

    extendSize(c) {
        // if (c == 'g') debugger;
        // if (c == 'u') debugger;
        // if (c == '0') debugger;
        // if (c == '?') debugger;
        let {width, height, orgW, orgH, ax, ay, scale} = this;

        let aw = width / orgW - 1;
        let ah = height / orgH - 1;

        this.ctx.resetTransform();

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

            this.canvas = flipAndCopyCanvas(this.canvas, 0, 0, width, height);
            this.ctx = this.canvas.getContext('2d');
            this.ctx.textBaseline = 'top';
            initFont(this.ctx, this.style);
        }

        this.ax = ax;
        this.ay = ay;
        this.width = width;
        this.height = height;

        // console.log('EXTENT ATLAS SIZE', _w, _h, '->', width, height);
        //
        // console.log('ax', ax, 'ay', ay);
        // console.log('aw', aw, 'ah', ah);
        // console.log('--------');

        this.ctx.transform(scale, 0, 0, scale, ax * orgW, ay * orgH);
    }

    addChars(text: string): boolean {
        const {glyphInfos, paddingX, paddingY, marginY, rowHeight, scale} = this;
        const avgGlyphHeight = this.avgGlyphHeight + 2 * paddingY;
        const orgW = this.orgW / scale;
        const orgH = this.orgH / scale;
        let maxHeight = orgH - rowHeight;

        let charOffsetX = this.ax * orgW;
        let charOffsetY = this.ay * orgH;
        let avgCharWidth = this.avgCharWidth;
        let added = false;
        let charWidth;

        // for (let i = 0, c, len = text.length; i < len; i++) {
        //     c = text.charAt(isRTL ? (len - 1 - i) : i);
        for (let c of text) {
            if (c != ' ' && !glyphInfos[c]) {
                charWidth = this.ctx.measureText(c).width;

                let code = c.charCodeAt(0);

                if (code) {
                    avgCharWidth = (avgCharWidth * this.length + charWidth) / ++this.length;

                    if (this.x + charWidth + paddingX > orgW) {
                        this.y += rowHeight;

                        if (this.y > maxHeight) {
                            this.extendSize(c);

                            // this.ctx.save();
                            // this.ctx.lineWidth = 2;
                            // this.ctx.strokeStyle = 'blue';
                            // this.ctx.beginPath();
                            // this.ctx.moveTo(0, 0);
                            // this.ctx.lineTo(0, orgH);
                            // this.ctx.stroke();
                            // this.ctx.restore();

                            this.y = this.marginY + this.paddingY;
                            charOffsetX = this.ax * (orgW);
                            charOffsetY = this.ay * (orgH);
                        }
                        this.x = this.marginX + this.paddingX;
                    }
                    added = true;

                    let _cw = charWidth;

                    charWidth = charWidth || avgCharWidth;

                    const glyphWidth = charWidth * scale;

                    drawCharacter(this.ctx, c, this.x, this.y, this.style);

                    let x = (this.x + charOffsetX) * scale - paddingX;
                    let y = (this.y + charOffsetY) * scale;
                    let w = glyphWidth ? glyphWidth + 2 * paddingX : 0;
                    let v = y - paddingY;

                    glyphInfos[c] = {
                        u1: x,
                        v2: v,
                        u2: x + w,
                        v1: v + avgGlyphHeight,
                        width: _cw ? w : 0,
                        height: avgGlyphHeight,
                        dir: getDirection(code)
                    };

                    this.x += charWidth + this.marginX + 2 / scale * paddingX;

                    // console.log(c, 'x', this.x, 'y', this.y, 'width', charWidth, 'charOffsetX', charOffsetX, glyphInfos[c], text.codePointAt(i));
                    //
                    // let ctx = this.ctx;
                    // ctx.save();
                    // ctx.setTransform(1, 0, 0, 1, 0, 0);
                    // ctx.lineWidth = 2;
                    // ctx.strokeStyle = 'black';
                    // ctx.beginPath();
                    // ctx.moveTo(glyphInfos[c].x, glyphInfos[c].y);
                    // ctx.lineTo(glyphInfos[c].x, glyphInfos[c].y + rowHeight);
                    // ctx.moveTo(glyphInfos[c].x + glyphInfos[c].width, glyphInfos[c].y);
                    // ctx.lineTo(glyphInfos[c].x + glyphInfos[c].width, glyphInfos[c].y + rowHeight);
                    // ctx.stroke();
                    // ctx.restore();
                }
            }
        }

        this.avgCharWidth = avgCharWidth;

        return added;
    }

    hasSpace(text: string): boolean {
        const ctx = this.ctx;
        const width = this.width;
        let marginX = this.marginX;
        let marginY = this.marginY;
        let paddingX = this.paddingX;
        let paddingY = this.paddingY;
        let x = this.x;
        let y = this.y;
        let charWidth;
        const glyphInfos = this.glyphInfos;
        const rowHeight = this.letterHeight + marginY + 2 * paddingY;
        const lastRowY = this.height - rowHeight;

        for (let c of text) {
            if (!glyphInfos[c]) {
                if (charWidth = ctx.measureText(c).width) {
                    if (x + charWidth > width) {
                        x = marginX;
                        y += rowHeight;

                        if (y > lastRowY) {
                            return false;
                        }
                    }
                    x += charWidth + marginX + 2 * paddingX;
                }
            }
        }

        return true;
    }
}

export {GlyphAtlas};
