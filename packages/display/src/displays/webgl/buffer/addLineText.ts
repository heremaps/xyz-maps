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

import {createTextData} from './createText';
import {GlyphTexture} from '../GlyphTexture';

const TO_DEG = 180 / Math.PI;

const angle = (dy: number, dx: number) => {
    return Math.atan(dy / dx);
    // return Math.atan2(dy, dx);
};

const addLineText = (text: string, point, vertex, texcoord, coordinates, glyphs: GlyphTexture, tile, tileSize: number, offsetX?: number, offsetY?: number) => {
    const fontInfo = glyphs.getAtlas();
    const vLength = coordinates.length;
    let x1 = tile.lon2x(coordinates[0][0], tileSize);
    let y1 = tile.lat2y(coordinates[0][1], tileSize);
    let x2;
    let y2;
    let dx;
    let dy;
    let cx;
    let cy;
    let lineWidth;
    let a;
    let textData;
    let position;
    let labelWidth = null;
    let numVertices;
    let tx;
    let ty;


    for (let c = 1; c < vLength; c++) {
        x2 = tile.lon2x(coordinates[c][0], tileSize);
        y2 = tile.lat2y(coordinates[c][1], tileSize);

        dx = x2 - x1;
        dy = y2 - y1;
        cx = dx / 2 + x1;
        cy = dy / 2 + y1;

        // not inside tile -> skip!
        if (cx >= 0 && cy >= 0 && cx < tileSize && cy < tileSize) {
            lineWidth = Math.sqrt(dx * dx + dy * dy);

            if (labelWidth == null) {
                labelWidth = fontInfo.getTextWidth(text);
            }
            // if (!textData) {
            //     glyphs.addChars(text);
            //     textData = createTextData(text, fontInfo/* , vertex, texcoord*/);
            //     position = textData.position;
            //     labelWidth = textData.width;
            //     numVertices = textData.numVertices;
            //     tx = textData.width * fontInfo.s / 2;
            //     ty = fontInfo.baselineOffset;
            // }

            if (Math.floor(lineWidth / labelWidth) > 0) {
                if (!textData) {
                    glyphs.addChars(text);
                    textData = createTextData(text, fontInfo/* , vertex, texcoord*/);
                    position = textData.position;
                    numVertices = textData.numVertices;
                    tx = textData.width * fontInfo.scale / 2 - offsetX;
                    ty = fontInfo.baselineOffset - offsetY;
                }

                let alpha = angle(dy, dx) * TO_DEG;
                a = 0;
                // a = 0;
                // let sin = Math.sin(a);
                // let cos = Math.cos(a);
                // let _dx;
                // let _dy;

                for (let i = 0, v = vertex.length, j; i < numVertices; i++) {
                    j = i * 2;

                    // _dx = position[j] - tx;
                    // point[point.length] = cos * _dx - sin * _dy;
                    point[point.length] = position[j] - tx; // + (i*8);

                    texcoord[v] = textData.texcoord[j];
                    vertex[v] = cx;
                    v++;

                    // _dy = position[j + 1] - ty;
                    // point[point.length] = sin * _dx + cos * _dy;
                    point[point.length] = position[j + 1] - ty; // + (i*8);

                    // console.log(point[point.length-2]=8,point[point.length-1]=8)

                    texcoord[v] = textData.texcoord[j + 1];
                    vertex[v] = cy;
                    v++;

                    point[point.length] = alpha;
                }
            }
        }

        x1 = x2;
        y1 = y2;
    }
};

export {addLineText};
