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
import {rotate} from '../../../geometry';

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
                let alpha = Math.atan2(dy, dx);
                const halfLabelWidth = labelWidth * .5;
                const halfLabelHeight = glyphAtlas.lineHeight * .5;

                const r1 = rotate(-halfLabelWidth, -halfLabelHeight, cx, cy, alpha);
                const r2 = rotate(halfLabelWidth, halfLabelHeight, cx, cy, alpha);
                const r3 = rotate(-halfLabelWidth, halfLabelHeight, cx, cy, alpha);
                const r4 = rotate(halfLabelWidth, -halfLabelHeight, cx, cy, alpha);

                const minX = Math.min(r1[0], r2[0], r3[0], r4[0]);
                const maxX = Math.max(r1[0], r2[0], r3[0], r4[0]);
                const minY = Math.min(r1[1], r2[1], r3[1], r4[1]);
                const maxY = Math.max(r1[1], r2[1], r3[1], r4[1]);

                const labelDx = (maxX - minX) * .5;
                const labelDy = (maxY - minY) * .5;

                if (dir == -1) {
                    alpha += Math.PI;
                }

                const center = rotate(cx + offsetX, cy + offsetY, cx, cy, alpha);

                const bufferStart = point.length;
                bufferLength = bufferLength || glyphs.bufferLength(text);

                if (!collisions || !collisions.collides(
                    center[0], center[1],
                    labelDx, labelDy,
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

                        addText(textLines, point, vertex, texcoord, glyphAtlas, cx, cy, 0, alpha * TO_DEG);
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
