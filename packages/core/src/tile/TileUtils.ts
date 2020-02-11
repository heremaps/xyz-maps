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

import projection from '../projection/webMercator';
import {global} from '@here/xyz-maps-common';

type Grid = [number, number, number];
type BBox = [number, number, number, number];
type Quadkey = string;
type Quadkeys = Array<Quadkey>;

const MATH = global.Math;
const TILE_SIZE = 256;

const MAX_LONGITUDE = 180;
const MIN_LONGITUDE = -MAX_LONGITUDE;
const MAX_LATITUDE = 85.05112878;
const MIN_LATITUDE = -MAX_LATITUDE;


export const geoToGrid = (longitude: number, latitude: number, z: number): Grid => {
    const size = 1 << z;
    const x = MATH.floor(projection.lon2x(longitude, size));
    const y = MATH.floor(projection.lat2y(latitude, size));
    return [x, y, z];
};

export const pixelToGrid = (x: number, y: number, z: number): Grid => {
    return [MATH.floor(x), MATH.floor(y), z];
};

export const quadToGrid = (quadKey: string): Grid => {
    if (typeof quadKey == 'number') {
        quadKey = String(quadKey);
    }

    const lvl = quadKey.length;
    let x = 0;
    let y = 0;

    for (let i = 0; i < lvl; ++i) {
        x *= 2;
        y *= 2;

        switch (quadKey[i]) {
        case '1':
            y++;
            break;
        case '3':
            y++;
        case '2':
            x++;
        }
    }

    return [lvl, x, y];
};

export const tileXYToQuadKey = (level: number, row: number, col: number): Quadkey => {
    let quadkey = '';
    let tiles;


    while (level-- > 0) {
        tiles = 1 << level;

        quadkey += (<any>((col & tiles) !== 0)) + (<any>((row & tiles) !== 0)) * 2;
    }

    return quadkey;
};

export const getGeoBounds = (level: number, y: number, x: number): BBox => {
    const mapSize = TILE_SIZE << level;
    const pixelX = TILE_SIZE * x;
    const pixelY = TILE_SIZE * y;

    return [
        projection.x2lon(pixelX, mapSize),
        projection.y2lat(pixelY + TILE_SIZE, mapSize),
        projection.x2lon(pixelX + TILE_SIZE, mapSize),
        projection.y2lat(pixelY, mapSize)

        // projection.y2lat( pixelY, mapSize ),
        // projection.x2lon( pixelX, mapSize ),
        // projection.y2lat( pixelY + TILE_SIZE, mapSize ),
        // projection.x2lon( pixelX + TILE_SIZE, mapSize )
    ];


    // function clip( n,  minValue,  maxValue){
    //    return Math.min(Math.max(n, minValue), maxValue);
    // }
    // var mapSize = TILE_SIZE << ZoomLevel,
    //  pixelX = TILE_SIZE * X,
    //  pixelY = TILE_SIZE * Y,
    //  x = (clip(pixelX, 0, mapSize - 1) / mapSize) - .5,
    //  y = .5 - (clip(pixelY, 0, mapSize - 1) / mapSize),
    //  x1 = (clip(pixelX+TILE_SIZE, 0, mapSize - 1) / mapSize) - .5,
    //  y1 = .5 - (clip(pixelY+TILE_SIZE, 0, mapSize - 1) / mapSize);
    // return [
    //  90 - 360 * MATH.atan(MATH.exp(-y * 2 * MATH.PI)) / MATH.PI,
    //  360 * x,
    //  90 - 360 * MATH.atan(MATH.exp(-y1 * 2 * MATH.PI)) / MATH.PI,
    //  360 * x1
    // ]
};

export const getTilesOfLevel = (quadkey: Quadkey, minLevel: number): Quadkeys => {
    const tiles = [quadkey];
    let t = 0;
    let levelOffset = tiles.length;
    let level = quadkey.length;

    if (minLevel <= level) {
        return [quadkey.substring(0, minLevel)];
    }

    while (level < minLevel) {
        for (; t < levelOffset; t++) {
            tiles.push(
                tiles[t] + '0',
                tiles[t] + '1',
                tiles[t] + '2',
                tiles[t] + '3'
            );
        }

        t = levelOffset;
        levelOffset = tiles.length;
        level++;
    }

    return tiles.slice(t);
};

export const getTilesIds = (topLeft: Grid, bottomRight: Grid): Quadkeys => {
    const tiles = [];
    const rows = bottomRight[1] - topLeft[1] + 1;
    const cols = bottomRight[0] - topLeft[0] + 1;
    const z = topLeft[2];

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            tiles[tiles.length] = tileXYToQuadKey(z, topLeft[1] + y, topLeft[0] + x);
        }
    }

    return tiles;
};

export const getTilesInRect =
    (minLon: number, minLat: number, maxLon: number, maxLat: number, level: number): Quadkeys => {
        if (maxLon >= MAX_LONGITUDE) {
            maxLon = MAX_LONGITUDE - 1e-6;
        }
        if (minLon <= MIN_LONGITUDE) {
            minLon = MIN_LONGITUDE;
        }

        if (maxLat >= MAX_LATITUDE) {
            maxLat = MAX_LATITUDE - 1e-6;
        }

        if (minLat < MIN_LATITUDE) {
            minLat = MIN_LATITUDE + 1e-6;
        }

        const topLeft = geoToGrid(minLon, maxLat, level);
        const bottomRight = geoToGrid(maxLon, minLat, level);

        return getTilesIds(topLeft, bottomRight);
    };

//* ***********************************************************************************************
// this.geoToGrid = function( longitude, latitude, level ) {
// var  sinLatitude = MATH.sin(latitude * MATH.PI / 180),
//  row = MATH.floor(((longitude + 180) / 360) * MATH.pow(2, level)),
//  col = MATH.floor((.5 - MATH.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * MATH.PI)) * MATH.pow(2, level));
// return [ level, col, row ];
// }

export default {
    geoToGrid,
    pixelToGrid,
    quadToGrid,
    tileXYToQuadKey,
    getGeoBounds,
    getTilesOfLevel,
    getTilesIds,
    getTilesInRect
};
