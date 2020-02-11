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
import {doPolygonsIntersect} from './geometry';

const tileUtils = tile.Utils;
const INFINITY = Infinity;


type GridTile = {
    quadkey: string,
    x: number,
    y: number
}

class Grid {
    private minX: number;
    private maxX: number;
    private minY: number;
    private maxY: number;

    // tile size
    private size: number;

    // center world pixel
    private cwpx: number;
    private cwpy: number;

    // width/height of screen
    private width: number;
    private height: number;

    // untransformed view bounds relative to screen
    private bounds: [number, number][];

    constructor(tileSize: number) {
        this.size = tileSize;
    }

    init(centerWorldPixel: [number, number], rotZRad: number, width: number, height: number, bounds) {
        this.cwpx = centerWorldPixel[0];
        this.cwpy = centerWorldPixel[1];

        this.width = width;
        this.height = height;
        this.bounds = bounds;

        let minOx = INFINITY;
        let maxOx = -minOx;
        let minOy = INFINITY;
        let maxOy = -minOy;

        for (let c of bounds) {
            if (c[0] < minOx) minOx = c[0];
            if (c[0] > maxOx) maxOx = c[0];

            if (c[1] < minOy) minOy = c[1];
            if (c[1] > maxOy) maxOy = c[1];
        }

        this.minX = minOx;
        this.maxX = maxOx;
        this.minY = minOy;
        this.maxY = maxOy;
    };


    getGrid(zoomLevel: number, tileSizePixel: number = this.size): GridTile[] {
        const {width, height} = this;
        const worldSizePixel = tileSizePixel << zoomLevel;
        let bounds = this.bounds;
        let tiles = [];

        let centerPixelX = this.cwpx * worldSizePixel;
        let centerPixelY = this.cwpy * worldSizePixel;

        let minX = centerPixelX - width / 2 + this.minX;
        let minY = centerPixelY - height / 2 + this.minY;
        let maxX = centerPixelX + width / 2 + this.maxX - width;
        let maxY = centerPixelY + height / 2 + this.maxY - height;

        let topLeftLRC = tileUtils.pixelToGrid(minX / tileSizePixel, minY / tileSizePixel, zoomLevel);
        let bottomRigthLRC = tileUtils.pixelToGrid(maxX / tileSizePixel, maxY / tileSizePixel, zoomLevel);

        let gridX = bottomRigthLRC[0] - topLeftLRC[0] + 1;
        let gridY = bottomRigthLRC[1] - topLeftLRC[1] + 1;
        let vpTiles = tileUtils.getTilesIds(topLeftLRC, bottomRigthLRC);
        let gridOx = topLeftLRC[0] * tileSizePixel - minX + this.minX;
        let gridOy = topLeftLRC[1] * tileSizePixel - minY + this.minY;

        for (let y = 0, i = 0; y < gridY; y++) {
            for (let x = 0; x < gridX; x++) {
                let tx1 = gridOx + x * tileSizePixel;
                let ty1 = gridOy + y * tileSizePixel;
                let tx2 = tx1 + tileSizePixel;
                let ty2 = ty1 + tileSizePixel;
                let qk = vpTiles[i++];
                let tileGeoContainer: [number, number][] = [
                    [tx1, ty1],
                    [tx2, ty1],
                    [tx2, ty2],
                    [tx1, ty2]
                ];

                if (doPolygonsIntersect(bounds, tileGeoContainer)) {
                    tiles.push({
                        quadkey: qk,
                        x: tx1,
                        y: ty1
                    });
                }
            }
        }

        return tiles;
    }
}


export default Grid;


