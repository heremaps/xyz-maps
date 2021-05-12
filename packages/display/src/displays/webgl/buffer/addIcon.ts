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

import {ImageInfo} from '../Atlas';
import {addPoint} from './addPoint';

const addIcon = (
    x: number,
    y: number,
    atlas: ImageInfo,
    width: number,
    height: number,
    points: number[],
    vertex: number[],
    texcoord: number[],
    rotation: number = 0
) => {
    let {u1, u2, v1, v2} = atlas;

    addPoint(x, y, vertex);

    // 10 bit rotation precision
    rotation = Math.round(rotation * 1024 / 360);

    const rotationHi = rotation >> 5;
    const rotationLow = (rotation & 31);

    u1 = u1 << 5 | rotationLow;
    u2 = u2 << 5 | rotationLow;
    v1 = v1 << 5 | rotationHi;
    v2 = v2 << 5 | rotationHi;

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

export {addIcon};
