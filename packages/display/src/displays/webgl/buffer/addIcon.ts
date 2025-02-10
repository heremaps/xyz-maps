/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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

import {ImageInfo} from '../Atlas';
import {addPoint} from './addPoint';
import {SimpleArray} from './templates/FlexArray';

export const addIcon = (
    x: number,
    y: number,
    z: number | boolean,
    normalizePosition: number,
    atlas: ImageInfo,
    width: number,
    height: number,
    points: SimpleArray<number>,
    vertex: SimpleArray<number>,
    texcoord: SimpleArray<number>,
    rotation: number = 0,
    hide?: boolean
) => {
    let {u1, u2, v1, v2} = atlas;

    // 9 bit rotation precision
    rotation = Math.round(rotation * 511 / 360);
    const rotationMSB = (rotation >> 8) & 1; // Bit 8 (MSB of 9-bit rotation)

    addPoint(x, y, z, normalizePosition, vertex, rotationMSB as 0 | 1);

    const rotationHi = (rotation >> 4) & 0x0F;
    const rotationLow = rotation & 0x0F;
    const scaleU = 0x0FFF / (atlas.atlasWidth - 1);
    const scaleV = 0x0FFF / (atlas.atlasHeight - 1);

    u1 *= scaleU;
    u2 *= scaleU;
    v1 *= scaleV;
    v2 *= scaleV;

    if (u2 > 0x0FFF) u2 = 0x0FFF;
    if (v2 > 0x0FFF) v2 = 0x0FFF;

    u1 = u1 << 4 | rotationLow;
    u2 = u2 << 4 | rotationLow;
    v1 = v1 << 4 | rotationHi;
    v2 = v2 << 4 | rotationHi;

    points.push(
        width, height,
        width, height,
        width, height,
        width, height,
        width, height,
        width, height
    );

    texcoord.push(
        u1, v2,
        u1, v1,
        u2, v1,
        u1, v2,
        u2, v1,
        u2, v2
    );
};
