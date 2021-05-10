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

import {createTextData, OFFSET_SCALE} from './createText';
import {GlyphAtlas} from '../GlyphAtlas';
import {FlexArray} from './templates/FlexArray';
import {wrapText} from '../../textUtils';

const EXTENT_SCALE = 128;

const addText = (
    cx: number,
    cy: number,
    lines: string[],
    offsets: FlexArray,
    vertex: FlexArray,
    texcoord: FlexArray,
    glyphAtlas: GlyphAtlas,
    rotation = 0,
) => {
    const lineCnt = lines.length;
    const lineHeight = glyphAtlas.lineHeight;

    let ty = (glyphAtlas.baselineOffset + (lineCnt - 1) * lineHeight * .5) * OFFSET_SCALE;

    cx *= EXTENT_SCALE;
    cy *= EXTENT_SCALE;

    // make sure rotation is 0->360 deg
    rotation = (rotation + 360) % 360;

    for (let text of lines) {
        let i = vertex.length;
        const textData = createTextData(text, glyphAtlas, rotation, offsets, texcoord);
        const tx = textData.width * glyphAtlas.scale / 2 * OFFSET_SCALE;
        const vertexCnt = textData.count * 2;

        vertex.reserve(vertexCnt);

        for (let offsetData = offsets.data, vertexData = vertex.data, len = i + vertexCnt; i < len; i += 2) {
            offsetData[i] -= tx;
            offsetData[i + 1] -= ty;

            vertexData[i] = cx;
            vertexData[i + 1] = cy;
        }

        vertex.length += vertexCnt;

        ty -= lineHeight * OFFSET_SCALE;
    }
};

export {addText};
