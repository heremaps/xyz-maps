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

import {tile} from '@here/xyz-maps-core';
import {ImageInfo} from '../Atlas';


const addIcon = (
    atlas: ImageInfo,
    width: number,
    height: number,
    points: number[],
    vertex: number[],
    texcoord: number[],
    coordinates: [number, number, number?],
    tile: tile.Tile,
    tileSize: number,
    i: number = vertex.length
) => {
    const x = tile.lon2x(coordinates[0], tileSize);
    const y = tile.lat2y(coordinates[1], tileSize);

    const y2 = height / 2;
    const x2 = width / 2;
    const x1 = -width / 2;
    const y1 = -height / 2;

    // const as = 1/32; //0.03125
    // const sx = width/64 * as;
    // const sy = height/64 * as;
    // const s = 0.01171875; // 24/64 * 0.03125
    // const u1 = atlas[1] * as;
    // const v1 = atlas[2] * as;
    // const u2 = u1 + sx;
    // const v2 = v1 + sy;

    const u1 = atlas.u1;
    const u2 = atlas.u2;
    const v1 = atlas.v1;
    const v2 = atlas.v2;

    vertex[i] = vertex[i + 2] = vertex[i + 4] = vertex[i + 6] = vertex[i + 8] = vertex[i + 10] = x;
    vertex[i + 1] = vertex[i + 3] = vertex[i + 5] = vertex[i + 7] = vertex[i + 9] = vertex[i + 11] = y;

    points[i] = x1;
    points[i + 1] = y1;
    texcoord[i] = u1;
    texcoord[i + 1] = v1;

    points[i + 2] = x2;
    points[i + 3] = y1;
    texcoord[i + 2] = u2;
    texcoord[i + 3] = v1;

    points[i + 4] = x1;
    points[i + 5] = y2;
    texcoord[i + 4] = u1;
    texcoord[i + 5] = v2;

    points[i + 6] = x1;
    points[i + 7] = y2;
    texcoord[i + 6] = u1;
    texcoord[i + 7] = v2;

    points[i + 8] = x2;
    points[i + 9] = y1;
    texcoord[i + 8] = u2;
    texcoord[i + 9] = v1;

    points[i + 10] = x2;
    points[i + 11] = y2;
    texcoord[i + 10] = u2;
    texcoord[i + 11] = v2;
};

export {addIcon};
