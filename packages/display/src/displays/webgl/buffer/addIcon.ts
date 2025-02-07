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
    points: SimpleArray<number>, // number[],
    vertex: SimpleArray<number>,
    texcoord: SimpleArray<number>, // number[],
    rotation: number = 0,
    hide?: boolean
) => {
    let {u1, u2, v1, v2} = atlas;

    addPoint(x, y, z, normalizePosition, vertex, hide);

    // 10 bit rotation precision
    rotation = Math.round(rotation * 255 / 360);

    const rotationHi = rotation >> 4;
    const rotationLow = (rotation & 15);

    const scaleU = 4095 / (atlas.atlasWidth-1);
    const scaleV = 4095 / (atlas.atlasHeight-1);

    u1 = (u1 * scaleU) << 4 | rotationLow;
    u2 = (u2 * scaleU) << 4 | rotationLow;
    v1 = (v1 * scaleV) << 4 | rotationHi;
    v2 = (v2 * scaleV) << 4 | rotationHi;

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
