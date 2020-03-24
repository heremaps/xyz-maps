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
import {tile} from '@here/xyz-maps-core';
// import rbush from 'rbush';

// const intersectBBox = (ax, ax2, ay, ay2, bx, bx2, by, by2) => {
//     return ax <= bx2 && bx <= ax2 && ay <= by2 && by <= ay2;
// };

// const collides = (box1, data) => {
//     for (let bbox2 of data) {
//         if (box1.minX <= bbox2.maxX && bbox2.minX <= box1.maxX && box1.minY <= bbox2.maxY && bbox2.minY <= box1.maxY) {
//             return true;
//         }
//     }
// };

const addText = (
    text: string,
    point: number[],
    vertex: number[],
    texcoord: number[],
    coordinates: number[],
    fontInfo,
    // glyphs: GlyphTexture,
    // tile: tile.Tile,
    // detectCollisions: boolean,
    // tileSize: number,
    cx: number,
    cy: number,
    offsetX?: number,
    offsetY?: number
) => {
    // const fontInfo = glyphs.getAtlas();
    // const cx = tile.lon2x(coordinates[0], tileSize);
    // const cy = tile.lat2y(coordinates[1], tileSize);
    const ty = fontInfo.baselineOffset - offsetY;
    // const rendered = levelCollisionData[tile.z];

    // glyphs.addChars(text);


    // let bbox;

    // console.log('add text');


    // if (detectCollisions) {
    //     const tileX = tile.x * tileSize;
    //     const tileY = tile.y * tileSize;
    //     // const estimatedTextWidth = fontInfo.getTextWidth(text);
    //     const estimatedTextWidth = fontInfo.avgCharWidth * text.length / 2;
    //
    //     // console.time('cntGlyphs');
    //     let glyphs = 0;
    //     for (let c of text) {
    //         if (c != ' ') glyphs++;
    //     }
    //     // console.timeEnd('cntGlyphs');
    //
    //     const x1 = tileX + cx - estimatedTextWidth;
    //     const x2 = tileX + cx + estimatedTextWidth;
    //     const y1 = tileY + cy - ty;
    //     const y2 = tileY + cy + ty;
    //
    //     const bbox = {
    //         minX: x1,
    //         maxX: x2,
    //         minY: y1,
    //         maxY: y2,
    //         tileX: tileX,
    //         tileY: tileY,
    //         bos: point.length,
    //         boe: point.length + glyphs * 18
    //     };
    //
    //     const collisionInfo = detectCollisions;
    //     // const collisionInfo = tile.collision;
    //     const rendered = collisionInfo.rendered;
    //     if (collides(bbox, rendered) || collides(bbox, collisionInfo.neighbours)) {
    //         return;
    //     }
    //     rendered.push(bbox);
    // }

    // glyphs.addChars(text);

    // const textVertex = [];
    // const textTextCoords = [];
    const textData = createTextData(text, fontInfo);
    const textVertex = textData.position;
    const textTextCoords = textData.texcoord;

    // const tx = textData.width / 2;

    const tx = textData.width * fontInfo.scale / 2 - offsetX;

    for (let v = 0; v < textVertex.length; v += 2) {
        point[point.length] = textVertex[v] - tx;
        point[point.length] = textVertex[v + 1] - ty;
        point[point.length] = 0;

        vertex[vertex.length] = cx;
        vertex[vertex.length] = cy;

        texcoord[texcoord.length] = textTextCoords[v];
        texcoord[texcoord.length] = textTextCoords[v + 1];
    }

    // if (bbox) {
    //     bbox[7] = point.length;
    // }
};


export {addText};
