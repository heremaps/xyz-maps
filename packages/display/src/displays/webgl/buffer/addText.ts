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

const addText = (
    text: string,
    point: number[],
    vertex: number[],
    texcoord: number[],
    coordinates: number[],
    fontInfo,
    cx: number,
    cy: number,
    offsetX?: number,
    offsetY?: number
) => {
    const ty = fontInfo.baselineOffset - offsetY;
    const textData = createTextData(text, fontInfo);
    const textVertex = textData.position;
    const textTextCoords = textData.texcoord;
    const tx = textData.width * fontInfo.scale / 2 - offsetX;

    for (let v = 0; v < textVertex.length; v += 2) {
        point.push(
            textVertex[v] - tx,
            textVertex[v + 1] - ty,
            0
        );

        vertex.push(cx, cy);

        texcoord.push(
            textTextCoords[v],
            textTextCoords[v + 1]
        );
    }
};


export {addText};
