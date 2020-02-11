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

const initFont = (ctx, style, fill?, stroke?) => {
    ctx.font = style.font || DEFAULT_FONT;

    if (typeof style.strokeWidth == 'number') {
        ctx.lineWidth = style.strokeWidth;
    } else {
        ctx.lineWidth = DEFAULT_STROKE_WIDTH;
    }

    ctx.strokeStyle = fill || style.stroke;
    ctx.fillStyle = stroke || style.fill;
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

const determineFontHeight = (ctx: CanvasRenderingContext2D, style, text: string, width?: number, height?: number) => {
    width = width || 128;
    height = height || 128;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    initFont(ctx, style);

    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';

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
    private onExtend: (w: number, h: number) => void;
    private style: {};
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

    constructor(style, dpr: number, width: number, height: number, onExtend?: (w: number, h: number) => void, text?: string) {
        // dpr = Math.ceil(dpr);

        width *= dpr;
        height *= dpr;

        let canvas = createCanvas(width, height);
        const ctx = (canvas).getContext('2d');

        this.scale = dpr;


        let styleId = (style.strokeWidth || DEFAULT_STROKE_WIDTH) + (style.font || DEFAULT_FONT) + (style.textAlign || DEFAULT_TEXT_ALIGN);
        let fontHeightInfo = fontHeightCache.get(styleId);
        let letterHeightBottom;
        let letterHeight;

        if (fontHeightInfo) {
            letterHeightBottom = fontHeightInfo[0];
            letterHeight = fontHeightInfo[1];
            ctx.textBaseline = 'top';
        } else {
            ctx.textBaseline = 'bottom';
            letterHeightBottom = determineFontHeight(ctx, style, 'gM').height * dpr;

            ctx.textBaseline = 'top';
            letterHeight = determineFontHeight(ctx, style, 'gM').height * dpr;

            fontHeightCache.set(styleId, [letterHeightBottom, letterHeight]);
        }
        // determine font height on scaled canvas is less precise
        // so we determine unscaled and scale afterwards
        ctx.transform(dpr, 0, 0, dpr, 0, 0);

        this.avgGlyphHeight = letterHeight;

        initFont(ctx, style, /* '#ff0000', '#00ff00' */);

        this.style = style;

        let sw = style.strokeWidth^0;

        // this.spacing = 13.5*this.paddingX;
        // this.spacing = sw + this.paddingX * 3;


        this.spacing = sw * 1.05;
        // this.spacing = sw * (1+letterHeight/220); // letterHeight 35 ->  14% contraction

        this.paddingX += sw * 1.25 * .5;
        this.paddingY += sw * .5;

        this.spaceWidth = (ctx.measureText(' ').width * dpr);

        this.letterHeight = letterHeight;

        // this.baselineOffset = 0; // top
        // this.baselineOffset = (letterHeight - letterHeightBottom); // bottom
        this.baselineOffset = (letterHeight - letterHeightBottom ) / 2 + this.paddingY; // middle

        this.width = width;
        this.height = height;

        this.orgW = width;
        this.orgH = height;

        this.canvas = canvas;
        this.ctx = ctx;
        this.style = style;

        this.x = this.marginX + this.paddingX;
        this.y = this.marginY + this.paddingY;

        if (text) {
            this.addChars(text);
        }

        this.onExtend = onExtend;
    };

    getTextWidth(text: string) {
        return this.ctx.measureText(text).width;
    }

    extendSize() {
        let {width, height, orgW, orgH, ax, ay, scale} = this;
        let aw = width / orgW - 1;
        let ah = height / orgH - 1;

        this.ctx.resetTransform();

        if (ax < aw) {
            ax++;
        } else if (ay < ah) {
            ay++;
            ax = 0;
        } else {
            width *= 2;
            height *= 2;

            // if (width < 2048) {
            //     width *= 2;
            // } else {
            //     height *= 2;
            // }

            ax++;
            ay = 0;

            this.canvas = flipAndCopyCanvas(this.canvas, 0, 0, width, height);
            this.ctx = this.canvas.getContext('2d');
            this.ctx.textBaseline = 'top';
            initFont(this.ctx, this.style, /* '#ff0000', '#00ff00' */);
        }

        this.ax = ax;
        this.ay = ay;
        this.width = width;
        this.height = height;

        this.ctx.transform(scale, 0, 0, scale, ax * orgW, ay * orgH);
    }

    addChars(text: string): boolean {// false | [number, number, number, number] {
        const {glyphInfos, paddingX, paddingY, marginY, scale} = this;

        const avgGlyphHeight = this.avgGlyphHeight + 2 * paddingY;
        const rowHeight = this.letterHeight / scale + marginY + 2 * paddingY;
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
