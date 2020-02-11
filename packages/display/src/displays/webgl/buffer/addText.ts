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
// import rbush from 'rbush';

// const intersectBBox = (ax, ax2, ay, ay2, bx, bx2, by, by2) => {
//     return ax <= bx2 && bx <= ax2 && ay <= by2 && by <= ay2;
// };

const collides = (box1, data) => {
    for (let bbox2 of data) {
        if (box1[0] <= bbox2[1] && bbox2[0] <= box1[1] && box1[2] <= bbox2[3] && bbox2[2] <= box1[3]) {
            return true;
        }
    }
};


const addText = (text: string, point, vertex, texcoord, coordinates, glyphs: GlyphTexture, tile, collision, tileSize: number, offsetX?: number, offsetY?: number) => {
    const fontInfo = glyphs.getAtlas();
    const cx = tile.lon2x(coordinates[0], tileSize);
    const cy = tile.lat2y(coordinates[1], tileSize);
    const ty = fontInfo.baselineOffset - offsetY;
    // const rendered = levelCollisionData[tile.z];

    glyphs.addChars(text);

    if (!collision) {
        const tileX = tile.x * tileSize;
        const tileY = tile.y * tileSize;
        // const estimatedTextWidth = fontInfo.getTextWidth(text);
        const estimatedTextWidth = fontInfo.avgCharWidth * text.length / 2;
        const x1 = tileX + cx - estimatedTextWidth;
        const x2 = tileX + cx + estimatedTextWidth;
        const y1 = tileY + cy - ty;
        const y2 = tileY + cy + ty;
        const bbox = [x1, x2, y1, y2];
        const collisionInfo = tile.collision;
        const rendered = collisionInfo.rendered;
        if (collides(bbox, rendered) || collides(bbox, collisionInfo.overlaps)) {
            return;
        }
        rendered.push(bbox);
    }

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
};


export {addText};
