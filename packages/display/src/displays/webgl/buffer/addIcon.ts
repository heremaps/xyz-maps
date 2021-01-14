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

import {Tile} from '@here/xyz-maps-core';
import {ImageInfo} from '../Atlas';
import {addPoint} from './addPoint';

const addIcon = (
    atlas: ImageInfo,
    width: number,
    height: number,
    points: number[],
    vertex: number[],
    texcoord: number[],
    coordinates: [number, number, number?],
    tile: Tile,
    tileSize: number
) => {
    if (addPoint(vertex, coordinates, tile, tileSize)) {
        const u1 = atlas.u1;
        const u2 = atlas.u2;
        const v1 = atlas.v1;
        const v2 = atlas.v2;

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
    }
};

export {addIcon};
