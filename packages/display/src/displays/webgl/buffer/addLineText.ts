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

import {GlyphTexture} from '../GlyphTexture';
import {CollisionHandler} from '../CollisionHandler';
import {tile} from '@here/xyz-maps-core';
import {PixelCoordinateCache} from './LineFactory';
import {FlexAttribute} from './templates/TemplateBuffer';
import {addText} from './addText';
import {FlexArray} from './templates/FlexArray';

type Tile = tile.Tile;

const TO_DEG = 180 / Math.PI;

const addLineText = (
    text: string,
    point: FlexArray,
    vertex: FlexArray,
    texcoordAttr: FlexAttribute,
    prjCoordinates: PixelCoordinateCache,
    glyphs: GlyphTexture,
    tile: Tile,
    tileSize: number,
    collisions: CollisionHandler,
    priority: number,
    minRepeatDistance: number,
    offsetX?: number,
    offsetY?: number
) => {
    const texcoord = texcoordAttr.data;
    const glyphAtlas = glyphs.getAtlas();
    const vLength = prjCoordinates.length / 2;
    const ty = glyphAtlas.baselineOffset - offsetY;
    let coordinates = prjCoordinates.data;
    let distancePrevLabel = Infinity;
    let textLines;
    let labelWidth = null;
    let bufferLength;
    let lineWidth;
    let x2;
    let y2;
    let dx;
    let dy;
    let cx;
    let cy;
    // for optimal repeat distance the first label gets placed in the middle of the linestring.
    let offset = Math.floor(vLength / 2) - 1;
    // we move to the end of the linestring..
    let dir = 1;
    let x1 = coordinates[offset * 2];
    let y1 = coordinates[offset * 2 + 1];
    let startX = x1;
    let startY = y1;
    let startDistance = distancePrevLabel;


    for (let i = 1; i < vLength; i++) {
        let c = offset + dir * i;
        if (c >= vLength) {
            // from now on we move from middle to beginning of linestring
            dir = -1;
            c = offset - 1;
            offset = vLength - 1;
            x1 = startX;
            y1 = startY;
            distancePrevLabel = startDistance;
        }

        x2 = coordinates[c * 2];
        y2 = coordinates[c * 2 + 1];
        dx = x2 - x1;
        dy = y2 - y1;
        cx = dx * .5 + x1;
        cy = dy * .5 + y1;

        // not inside tile -> skip!
        if (cx >= 0 && cy >= 0 && cx < tileSize && cy < tileSize) {
            lineWidth = Math.sqrt(dx * dx + dy * dy);

            if (labelWidth == null) {
                labelWidth = glyphAtlas.getTextWidth(text);
            }

            if (Math.floor(lineWidth / labelWidth) > 0) {
                let halfLabelWidth = labelWidth * .25;
                let f = halfLabelWidth / lineWidth;
                let fh = (.5 * ty) / lineWidth;
                let labelx1 = cx - (dx * f);
                let labely1 = cy + (dy * f);
                let labelx2 = cx + (dx * f);
                let labely2 = cy - (dy * f);

                if (dy < 0 && dx > 0 || (dx < 0 && dy > 0)) {
                    dy *= -1;
                    dx *= -1;
                }

                labelx1 += fh * -dy;
                labely1 += fh * dx;
                labelx2 += fh * dy;
                labely2 += fh * -dx;

                let labeldx = Math.abs(labelx2 - labelx1);
                let labeldy = Math.abs(labely2 - labely1);
                const bufferStart = point.length;

                bufferLength = bufferLength || glyphs.bufferLength(text);

                if (!collisions || !collisions.collides(
                    cx, cy,
                    labeldx, labeldy,
                    tile, tileSize,
                    bufferStart, bufferStart + bufferLength,
                    texcoordAttr,
                    priority
                )) {
                    let d = (lineWidth - labelWidth) / 2;

                    if (distancePrevLabel + d < minRepeatDistance) {
                        distancePrevLabel += lineWidth;
                    } else {
                        if (startDistance == Infinity) {
                            startDistance = d;
                        }
                        distancePrevLabel = d;

                        if (!textLines) {
                            glyphs.addChars(text);
                            textLines = [text];
                        }

                        let alpha = Math.atan2(dy, dx) * TO_DEG;
                        // make sure angle is 0->360 deg
                        alpha = (alpha + 360) % 360;

                        if (alpha >= 180) {
                            alpha -= 180;
                        }

                        addText(textLines, point, vertex, texcoord, glyphAtlas, cx, cy, offsetX, offsetY, 0, alpha);
                    }
                }
            } else {
                distancePrevLabel += lineWidth;
            }
        }

        x1 = x2;
        y1 = y2;
    }
};

export {addLineText};
