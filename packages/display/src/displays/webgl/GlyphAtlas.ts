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
const DEFAULT_STROKE_WIDTH = 1;
const DEFAULT_FONT = 'normal 12px Arial';
const DEFAULT_TEXT_ALIGN = 'start';

const GLYPH_FILL = '#ff0000';
const GLYPH_STROKE = '#00ff00';

// export const isArabic = (text: string) => {
//     const cc = text.charCodeAt(0);
//     //            arabic                            Arabic Supplement
//     return (cc >= 0x0600 && cc <= 0x06ff) || (cc >= 0x0750 && cc <= 0x077F);
// };
//
// function isRTL(s) {
//     var ltrChars = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF';
//     var rtlChars = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC';
//     var rtlDirCheck = new RegExp('^[^' + ltrChars + ']*[' + rtlChars + ']');
//     return rtlDirCheck.test(s);
// };

export const isArabicOrHebrew = (text: string) => /[\u0590-\u06FF]/.test(text);


type FontStyle = {
    font?: string;
    textAlign?: string;
    strokeWidth?: number;
    stroke?: string;
    fill?: string;
}


// const toCSS = (rgb: number[] | string): string => {
//     if (rgb instanceof Array) {
//         return `rgb(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)})`;
//     }
//     return rgb;
// };

const initFont = (ctx, style: FontStyle, fill = GLYPH_FILL, stroke = GLYPH_STROKE) => {
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

const drawCharacter = (ctx: CanvasRenderingContext2D, c: string, x: number, y: number, style) => {
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

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
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
    x: number;
    y: number;
    width: number;
    height: number;
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

        size = 64;

        if (size) {
            optimizedSize = size;
        } else {
            size = 128;
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

        this.spacing = sw * 1.05;
        this.paddingX += sw * 1.25 * .5;
        this.paddingY += sw * .5;

        this.spaceWidth = (ctx.measureText(' ').width * scale);

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

        if (text) {
            this.addChars(text);
        }
    };

    getTextWidth(text: string) {
        const {ctx} = this;
        // 2x linewidth is roughly estimated but good enough
        return ctx.measureText(text).width + 2 * ctx.lineWidth;
    }

    extendSize() {
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

        this.ctx.transform(scale, 0, 0, scale, ax * orgW, ay * orgH);
    }

    addChars(text: string): boolean {// false | [number, number, number, number] {
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

        for (let c of text) {
            if (c != ' ' && !glyphInfos[c]) {
                charWidth = this.ctx.measureText(c).width;

                if (charWidth) {
                    avgCharWidth = (avgCharWidth * this.length + charWidth) / ++this.length;

                    if (this.x + charWidth + paddingX > orgW) {
                        this.y += rowHeight;

                        if (this.y > maxHeight) {
                            this.extendSize();

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

                    drawCharacter(this.ctx, c, this.x, this.y, this.style);

                    let x = (this.x + charOffsetX) * scale;
                    let y = (this.y + charOffsetY) * scale;

                    glyphInfos[c] = {
                        x: x - paddingX,
                        y: y - paddingY,
                        width: charWidth * scale + 2 * paddingX,
                        height: avgGlyphHeight
                    };

                    this.x += charWidth + this.marginX + 2 / scale * paddingX;

                    // console.log(c, 'x', this.x, 'y', this.y, 'width', charWidth, 'charOffsetX', charOffsetX, glyphInfos[c]);
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

        // const rowAdded = startY != this.y;
        //
        // return updated && [
        //     rowAdded
        //         ? 0
        //         : startX - paddingX,
        //     startY - paddingY,
        //     rowAdded
        //         ? width
        //         : this.x,
        //     this.y + rowHeight
        // ];
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
