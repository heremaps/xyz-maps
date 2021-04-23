/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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

import {FontStyle} from './webgl/GlyphTexture';

let c = document.createElement('canvas');
let ctx = c.getContext('2d');
let defaultStr = 'abcdefghijklmnopqrstuvwxyz';
defaultStr = defaultStr + defaultStr.toUpperCase() + ' 0123456789';

let defaultStrLen = defaultStr.length;
let size = {};

const DEFAULT_LINE_WRAP = 14;

export const defaultFont = 'normal 12px Arial';

export const initFont = (
    ctx: CanvasRenderingContext2D,
    style: FontStyle,
    fill: string,
    stroke: string
) => {
    ctx.font = style.font || defaultFont;

    if (typeof style.strokeWidth == 'number') {
        ctx.lineWidth = style.strokeWidth;
    } else {
        ctx.lineWidth = 1;
    }

    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;

    ctx.textAlign = <CanvasTextAlign>style.textAlign || 'start';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
};

export const drawCharacter = (ctx: CanvasRenderingContext2D, c: string, x: number, y: number, style) => {
    const {fill, stroke, strokeWidth} = style;

    if (stroke && strokeWidth != 0) {
        ctx.strokeText(c, x, y);
    }
    if (fill) {
        ctx.fillText(c, x, y);
    }
};

export const determineFontHeight = (ctx: CanvasRenderingContext2D, style: FontStyle, text: string, width?: number, height?: number) => {
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


export const getAvgCharDimensions = (style: FontStyle = {}) => {
    let {font, strokeWidth} = style;
    font = font || defaultFont;
    strokeWidth = strokeWidth || 0;

    const fontId = font + strokeWidth;

    if (!size[fontId]) {
        ctx.font = font;
        ctx.textBaseline = 'top';
        size[fontId] = {
            width: ctx.measureText(defaultStr).width / defaultStrLen,
            height: determineFontHeight(ctx, style, 'gM').height
        };
    }

    return size[fontId];
};

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

