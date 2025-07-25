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

import {tileUtils} from '@here/xyz-maps-core';
import {doPolygonsIntersect} from './geometry';
import BasicDisplay from './displays/BasicDisplay';


const INFINITY = Infinity;

interface ViewportTile {
    quadkey: string,
    x: number,
    y: number,
    scaledSize: number;
}

export class GridTile implements ViewportTile {
    static minTileSize: number = 256;
    static tileGeoContainer: number[][] = [[0, 0], [0, 0], [0, 0], [0, 0]];

    quadkey: string;
    x: number;
    y: number;
    scaledSize: number;
    tileZoomLevel: number;
    gridX: number;
    gridY: number;

    private bounds: number[][];
    private resultCache: { [key: number]: ViewportTile[] };

    constructor(tileZoomLevel: number, x: number, y: number, size: number, gridX: number, gridY: number, bounds: number[][]) {
        this.quadkey = tileUtils.tileXYToQuadKey(tileZoomLevel, gridY, gridX);
        this.tileZoomLevel = tileZoomLevel;
        this.x = x;
        this.y = y;
        this.scaledSize = size;

        this.gridX = gridX;
        this.gridY = gridY;
        this.bounds = bounds;

        this.resultCache = {};
    }

    static updateTileBBox(tx1: number, ty1: number, tileSize: number) {
        const tileGeoContainer = GridTile.tileGeoContainer;
        const [tile1, tile2, tile3, tile4] = tileGeoContainer;
        const tx2 = tx1 + tileSize;
        const ty2 = ty1 + tileSize;

        tile1[0] = tx1;
        tile1[1] = ty1;

        tile2[0] = tx2;
        tile2[1] = ty1;

        tile3[0] = tx2;
        tile3[1] = ty2;

        tile4[0] = tx1;
        tile4[1] = ty2;

        return tileGeoContainer;
    }

    static intersects(bounds: number[][], x: number, y: number, size: number) {
        const tileGeoContainer = GridTile.updateTileBBox(x, y, size);
        return doPolygonsIntersect(bounds, tileGeoContainer);
    }

    generateTileHierarchy(
        display: BasicDisplay,
        minTileSize: number = GridTile.minTileSize,
        useAdaptiveLOD: boolean = true,
        tiles: ViewportTile[] = []
    ): ViewportTile[] {
        const cacheKey = minTileSize << 1 | Number(useAdaptiveLOD);
        const cache = this.resultCache;
        if (cache[cacheKey]) {
            return cache[cacheKey];
        }
        cache[cacheKey] = tiles;

        let {tileZoomLevel, gridX, gridY, scaledSize} = this;

        if (scaledSize > minTileSize) {
            const displayScale = display.s;
            const distanceScale = display.computeDistanceScale(
                this.x + scaledSize / 2,
                this.y + scaledSize / 2
            ) / displayScale;
            const zoomLevelDelta = Math.log2(scaledSize / minTileSize);

            if (useAdaptiveLOD) {
                // Adjust LOD threshold based on pitch:
                // higher pitch (more tilted view) → less detail near the horizon (later LOD split)
                const LOD_DISTANCE_SCALE_FACTOR = Math.sin(display.rx); // 0.875
                if (distanceScale * LOD_DISTANCE_SCALE_FACTOR > zoomLevelDelta) {
                    tiles.push(this);
                    return tiles;
                }
            }
            tileZoomLevel += 1;
            scaledSize *= 0.5;
            gridX *= 2;
            gridY *= 2;

            for (let [gridOffsetX, gridOffsetY] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
                const x = this.x + gridOffsetX * scaledSize;
                const y = this.y + gridOffsetY * scaledSize;

                if (GridTile.intersects(this.bounds, x, y, scaledSize)) {
                    const subTile = new GridTile(tileZoomLevel, x, y, scaledSize, gridX + gridOffsetX, gridY + gridOffsetY, this.bounds);
                    subTile.generateTileHierarchy(display, minTileSize, useAdaptiveLOD, tiles);
                }
            }
        } else {
            if (!useAdaptiveLOD) {
                if (
                    display.isPointAboveHorizon(this.x + scaledSize / 2, this.y + scaledSize / 2)
                ) {
                    return tiles;
                }
            }
            tiles.push(this);
        }
        return tiles;
    }
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
    private bounds: number[][];

    constructor(tileSize: number) {
        this.size = tileSize;
    }

    init(centerWorldPixel: number[], width: number, height: number, bounds: number[][]) {
        this.cwpx = centerWorldPixel[0];
        this.cwpy = centerWorldPixel[1];

        this.width = width;
        this.height = height;
        // used for clipping
        this.bounds = bounds;

        let minOx = INFINITY;
        let maxOx = -minOx;
        let minOy = INFINITY;
        let maxOy = -minOy;

        for (let [x, y] of bounds) {
            if (x < minOx) minOx = x;
            if (x > maxOx) maxOx = x;

            if (y < minOy) minOy = y;
            if (y > maxOy) maxOy = y;
        }

        this.minX = minOx;
        this.maxX = maxOx;
        this.minY = minOy;
        this.maxY = maxOy;
    };

    getTiles(zoomLevel: number, zoomOutLookahead: number = 3): GridTile[] {
        const {width, height} = this;

        // let zoomOutLookahead = Math.log2(4096) - 8; // for 512px tiles
        let baseTileSize = 512;
        const baseTileSizeLookOutAhead = Number(baseTileSize == 512);
        // const baseTileSizeLookOutAhead = 0;

        let tileSize = baseTileSize * (1 << zoomOutLookahead);
        let tileZoomLevel = zoomLevel - zoomOutLookahead - baseTileSizeLookOutAhead;
        const worldSizePixel = Math.pow(2, tileZoomLevel) * tileSize;
        const centerPixelX = this.cwpx * worldSizePixel;
        const centerPixelY = this.cwpy * worldSizePixel;

        let minX = (centerPixelX - width / 2 + this.minX) / tileSize;
        let minY = (centerPixelY - height / 2 + this.minY) / tileSize;
        let maxX = (centerPixelX + width / 2 + this.maxX - width) / tileSize;
        let maxY = (centerPixelY + height / 2 + this.maxY - height) / tileSize;


        // let [topLeftRow, topLeftCol] = tileUtils.pixelToGrid(minX, minY, tileZoomLevel);
        let topLeftRow = Math.floor(minX);
        let topLeftCol = Math.floor(minY);
        // let [bottomRightRow, bottomRightCol] = tileUtils.pixelToGrid(maxX, maxY, tileZoomLevel);
        let bottomRightRow = Math.floor(maxX);
        let bottomRightCol = Math.floor(maxY);

        let gridX = bottomRightRow - topLeftRow + 1;
        let gridY = bottomRightCol - topLeftCol + 1;
        let gridOx = (topLeftRow - minX) * tileSize + this.minX;
        let gridOy = (topLeftCol - minY) * tileSize + this.minY;

        const tiles = [];

        for (let y = 0; y < gridY; y++) {
            for (let x = 0; x < gridX; x++) {
                const topLeftScreenX = gridOx + x * tileSize;
                const topLeftScreenY = gridOy + y * tileSize;

                if (GridTile.intersects(this.bounds, topLeftScreenX, topLeftScreenY, tileSize)) {
                    const gridTile = new GridTile(tileZoomLevel, topLeftScreenX, topLeftScreenY, tileSize, topLeftRow + x, topLeftCol + y, this.bounds);
                    tiles.push(gridTile);
                }
            }
        }
        return tiles;
    };
}


export default Grid;


