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
import {CollisionHandler} from '../CollisionHandler';

import {normalize, multiply} from 'gl-matrix/vec2';

const TO_DEG = 180 / Math.PI;

const angle = (dy: number, dx: number) => {
    return Math.atan(dy / dx);
    // return Math.atan2(dy, dx);
};

let DBG=false;

const addLineText = (text: string, pointAttr, vertex, texcoord, coordinates, glyphs: GlyphTexture, tile, tileSize: number, collisions: CollisionHandler, offsetX?: number, offsetY?: number) => {
    const point = pointAttr.data;
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


            // glyphs.addChars(text);
            // const fontInfo = glyphs.getAtlas();
            // const estimatedTextWidth = fontInfo.avgCharWidth * text.length / 2;
            // const ty = fontInfo.baselineOffset - offsetY;
            // // collides(cx,cy,width,height,tile, tileSize, fontInfo, bufferIndex: number) {

            // if (style.collide || !this.collisions.collides(
            //     cx, cy,
            //     estimatedTextWidth, ty,
            //     tile, tileSize,
            //     bufferStart, bufferStart + glyphCnt * 6 * 3
            // )) {


            if (Math.floor(lineWidth / labelWidth) > 0) {
                ty = fontInfo.baselineOffset - offsetY;


                //* ***********************************************************************************


                //* ***********************************************************************************
                let w = labelWidth * .5;
                let h = labelWidth * .5;

                // console.log('######', lineWidth, labelWidth, '->', Math.floor(lineWidth / labelWidth));


                let halfLabelWidth = labelWidth * .25;
                let f = halfLabelWidth / lineWidth;

                let fh = (.5 * ty) / lineWidth;

                // if( y1<y2 ){
                //     fh *= -1;
                // }


                let labelx1 = cx - (dx * f);
                let labely1 = cy + (dy * f);
                let labelx2 = cx + (dx * f);
                let labely2 = cy - (dy * f);


                if (dy < 0 && dx > 0 || (dx < 0 && dy > 0)) {
                    dy *= -1;
                    dx *= -1;
                }


                // let labelx1 = cx - (dx * f + fh * 0);
                // let labely1 = cy + (dy * f + fh * 0);
                labelx1 += fh * -dy;
                labely1 += fh * dx;


                // addPixelPoint(_x - labely1 + cy, _y - labelx1 + cx);

                // let labelx2 = cx + (dx * f + fh * 0);
                // let labely2 = cy - (dy * f + fh * 0);
                labelx2 += fh * dy;
                labely2 += fh * -dx;


                // if(y1>y2){
                //     fh*=-1;
                // }

                let labeldx = Math.abs(labelx2 - labelx1);
                let labeldy = Math.abs(labely2 - labely1);


                w = labeldx;
                h = labeldy;


                if (DBG ) {
                    let debuglayer = window.display.getLayers(1);
                    let pixelScreen = display.geoToPixel(coordinates[c - 1][0], coordinates[c - 1][1]);
                    let _x = dx / 2 + pixelScreen.x;
                    let _y = dy / 2 + pixelScreen.y;
                    window.addPixelLine([
                        [_x - w, _y + h],
                        [_x + w, _y + h],
                        [_x + w, _y - h],
                        [_x - w, _y - h],
                        [_x - w, _y + h]
                    ], text + c, debuglayer, [{
                        zIndex: 8,
                        type: 'Line',
                        strokeWidth: 2,
                        stroke: 'green',
                        collide: true
                    }]);
                }


                let glyphCnt = 0;
                for (let c of text) {
                    if (c != ' ') glyphCnt++;
                }
                const bufferStart = point.length;
                if (collisions && collisions.collides(
                    cx, cy,
                    // labelWidth * .5, labelWidth * .5,
                    labeldx, labeldy,
                    tile, tileSize,
                    bufferStart, bufferStart + glyphCnt * 6 * 3,
                    pointAttr
                )) {
                    if (DBG ) {
                        console.log('COLL!!!!!!!!!', tile.quadkey);

                        debuglayer.setStyleGroup(debuglayer.search(text + c), [{
                            zIndex: 8,
                            type: 'Line',
                            strokeWidth: 2,
                            stroke: 'red',
                            collide: true
                        }]);
                    }


                    continue;
                }

                if (!textData) {
                    glyphs.addChars(text);
                    textData = createTextData(text, fontInfo/* , vertex, texcoord*/);
                    position = textData.position;
                    numVertices = textData.numVertices;
                    tx = textData.width * fontInfo.scale / 2 - offsetX;
                    // ty = fontInfo.baselineOffset - offsetY;
                }

                let alpha = angle(dy, dx) * TO_DEG;

                // make sure angle is 0->360 deg
                alpha = (alpha+360)%360;

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
            } else {
                if (DBG )window.removeLine(text + c, window.display.getLayers(1));
            }
        } else {
            // console.log('SKIP!',tile.quadkey)
        }

        x1 = x2;
        y1 = y2;
    }
};

export {addLineText};
