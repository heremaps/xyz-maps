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

import DrawLineSymbol from './LineSymbolDrawer';

type Label = string | number | boolean;

let UNDEF;

class DrawLineText extends DrawLineSymbol {
    cw: number;
    lw: number;
    label: Label;

    constructor(charWidth: number) {
        super();
        super.init(0.5);
        this.setCharWidth(charWidth);
    }

    setCharWidth(cw: number) {
        this.cw = cw;
    }

    init(label: Label) {
        if (typeof label != 'string') {
            label = String(label);
        }
        // measureText is too slow
        this.lw = label.length * this.cw;

        this.label = label;

        return true;
    }

    angle(dy: number, dx: number) {
        return Math.atan(dy / dx);
    }

    createSymbol(lineWidth: number) {
        const label = this.label;
        const charWidth = this.cw;
        const labelWidth = this.lw;
        let labelSpaceCnt = Math.floor(lineWidth / labelWidth);
        let text;
        let spaceChars;

        if (labelSpaceCnt > 0) {
            text = label;

            if (labelSpaceCnt > 1) {
                labelSpaceCnt = 1 + Math.floor((labelSpaceCnt - 1) / 8);
                spaceChars = new Array(Math.floor(1.5 * (lineWidth - labelWidth) / charWidth / labelSpaceCnt)).join(' ');
                text = label + new Array(labelSpaceCnt).join(spaceChars + label);
            }
        }
        return text;
    }

    drawSymbol(symbol, cx: number, cy: number, ctx: CanvasRenderingContext2D, renderStyle) {
        if (renderStyle.stroke) {
            ctx.strokeText(symbol, cx, cy);
        }

        if (renderStyle.fill) {
            ctx.fillText(symbol, cx, cy);
        }
    }
};

export default DrawLineText;
