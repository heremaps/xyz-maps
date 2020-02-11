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

import drawPoint from './drawPoint';

const MATH = Math;
const NODE_SPACING = 2 * 8;

class LineSymbolDrawer {
    lw: number;
    o: number = 0.5;

    constructor() {

    }

    init(offset) {
        this.o = offset;
        return true;
    }

    createSymbol(lineWidth: number, renderStyle) {
        let d;

        if (renderStyle.type == 'Circle') {
            d = renderStyle.radius;
        } else {
            d = renderStyle.width;
        }

        return lineWidth - d > 0;
    }

    drawSymbol(symbol, x, y, ctx, renderStyle, tile, feature, displayTile, layer, pmap, renderer) {
        drawPoint(renderStyle.type, x, y, renderStyle, feature, false, tile, displayTile, ctx, layer, pmap, renderer);
    }

    angle(dy: number, dx: number) {
        return Math.atan2(dy, dx);
    }

    place(coords: number[][], tile, ctx: CanvasRenderingContext2D, feature, renderStyle, displayTile, layer, pmap, renderer, devicePixelRatio: number) {
        let p1x;
        let p1y;
        let p2x;
        let p2y;
        let lineWidth;
        let symbol;
        let cx;
        let cy;
        let dx;
        let dy;
        const offset = this.o;

        p1x = tile.lon2x(coords[0][0]);
        p1y = tile.lat2y(coords[0][1]);

        for (let i = 1; i < coords.length; i++) {
            p2x = tile.lon2x(coords[i][0]);
            p2y = tile.lat2y(coords[i][1]);

            dx = p2x - p1x;
            dy = p2y - p1y;

            lineWidth = MATH.sqrt(MATH.pow(dx, 2) + MATH.pow(dy, 2)) - NODE_SPACING;

            symbol = this.createSymbol(lineWidth, renderStyle);

            if (symbol) {
                cx = (dx * offset + p1x) * devicePixelRatio;
                cy = (dy * offset + p1y) * devicePixelRatio;

                ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, cx, cy);

                ctx.rotate(this.angle(dy, dx));

                ctx.translate(-cx, -cy);

                this.drawSymbol(symbol, cx, cy, ctx, renderStyle, tile, feature, displayTile, layer, pmap, renderer);

                ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
            }
            p1x = p2x;
            p1y = p2y;
        }
    }
};

export default LineSymbolDrawer;
