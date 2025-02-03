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

import {quadToGrid, getGeoBounds} from './TileUtils';
import RTree from '../features/RTree';
import projection from '../projection/webMercator';
import {Feature} from '../features/Feature';
import {GeoJSONCoordinate, GeoJSONBBox} from '../features/GeoJSON';
import TileProvider from '../providers/TileProvider/TileProvider';
import {NetworkError} from '../loaders/HTTPLoader';


const TILESIZE = 256;

const NULL = null;

/**
 *  This Class represents a WebMercator Tile.
 */
export class Tile {
    clipped: boolean;
    /**
     *  quadkey of the tile.
     */
    quadkey: string;
    /**
     *  z (zoonlevel) of the tile.
     */
    z: number;
    /**
     *  y of the tile.
     */
    y: number;
    /**
     *  x of the tile.
     */
    x: number;
    /**
     *  type of the tile.
     */
    type: string;
    /**
     *  Geographical Bounding box has the coordinates in order: [minLon, minLat, maxLon, maxLat].
     */
    bounds: GeoJSONBBox;
    /**
     * Represents an error that occurred during tile processing.
     *
     * This property is set when an error is encountered while performing operations on the tile,
     * such as network failures during the loading of remote tile data.
     *
     */
    error?: NetworkError;

    data: any;
    loadStartTs: number;
    loadStopTs: number;
    provider: TileProvider;
    onLoaded: any;
    cbnds: GeoJSONBBox;

    private tree: any;

    private expire: number;

    constructor(quadkey: string, type: string, clipped: boolean, expire?: number) {
        const grid = quadToGrid(quadkey);
        this.quadkey = quadkey;
        this.z = grid[0];
        this.y = grid[1];
        this.x = grid[2];
        this.type = type;
        this.bounds = getGeoBounds(grid[0], grid[1], grid[2]);
        this.expire = expire;
        this.clipped = clipped;
    }

    /**
     *  Checks if tile expires at given point of time.
     *
     *  @returns true when tile has expired, otherwise false.
     */
    expired(ts: number) {
        ts = ts || Date.now();
        return ts - this.loadStopTs > this.expire * 1000;
    };


    /**
     *  add a feature to the tile.
     *
     *  @param feature - the Feature to add
     */
    add(feature: Feature) {
        const data = this.data;

        if (data?.indexOf(feature) == -1) {
            data.push(feature);
            this.tree?.insert(feature);
        }
    };

    /**
     *  remove feature to the tile.
     *
     *  @param feature - the Feature to remove
     */
    remove(feature: Feature) {
        const tileIndex = this.data.indexOf(feature);

        if (tileIndex !== -1) {
            this.data.splice(tileIndex, 1);

            this.tree?.remove(feature);
        }
    };

    // /**
    //  *  search for features by bounding box in the tile.
    //  *
    //  *  @param bbox -  the bounding box has the coordinates in the order: [minX, minY, maxX, maxY]
    //  */
    search(bbox: {minX:number, maxX:number, minY: number, maxY: number}): any[] {
        if (this.data) {
            if (!this.tree) {
                // console.time('create tile index ' + this.quadkey);
                this.tree = new RTree(9);
                this.tree.load(this.data);
                // console.timeEnd('create tile index ' + this.quadkey);
            }
            return this.tree.search(bbox);
        }
    };

    /**
     *  check if the tile  has been fully loaded
     */
    isLoaded(): boolean {
        return typeof this.loadStopTs == 'number';
    };


    /**
     *  get tile bound including margin.
     *  @returns the bounding box with geographical coordinates [minLon, minLat, maxLon, maxLat]
     */
    getContentBounds(): [number, number, number, number] {
        if (!this.cbnds) {
            const {bounds, provider} = this;
            const {margin} = provider;
            if (margin) {
                const tileSize = provider.size;
                const worldsize = tileSize << this.z;
                const x = projection.lon2x(bounds[0], worldsize);
                const y = projection.lat2y(bounds[1], worldsize);
                this.cbnds = [
                    projection.x2lon(x - margin, worldsize),
                    projection.y2lat(y + margin, worldsize),
                    projection.x2lon(x + margin + tileSize, worldsize),
                    projection.y2lat(y - margin - tileSize, worldsize)
                ];
            } else {
                this.cbnds = this.bounds;
            }
        }
        return this.cbnds;
    };

    project(lon: number, lat: number): number[] {
        const worldsize = TILESIZE << this.z;
        const tileX = this.x * TILESIZE;
        const tileY = this.y * TILESIZE;

        return [
            Math.round(projection.lon2x(lon, worldsize) - tileX),
            Math.round(projection.lat2y(lat, worldsize) - tileY)
        ];
    };

    lon2x(lon: number, width: number = TILESIZE): number {
        const worldsize = width << this.z;
        const tileX = this.x * width;
        return projection.lon2x(lon, worldsize) - tileX; // +.5^0;
    };

    lat2y(lat: number, height: number = TILESIZE): number {
        const worldsize = height << this.z;
        const tileY = this.y * height;
        return projection.lat2y(lat, worldsize) - tileY; // +.5^0;
    };

    isInside(point: GeoJSONCoordinate) {
        const [minLon, minLat, maxLon, maxLat] = this.bounds;
        const [x, y] = point;
        return x >= minLon && x < maxLon && y > minLat && y <= maxLat;
    };
}


const TileProto: any = Tile.prototype;

TileProto.expire = Infinity;
TileProto.error = NULL;

// Actual DRAWN position on canvas.
// NULL/UNDEF if not drawn.
TileProto.canvasX = NULL;
TileProto.canvasY = NULL;


// TileProto.lon2x = function( lon )
// {
//     return TILESIZE / (this.bounds[2] - this.bounds[0]) * (lon - this.bounds[0]);
// }
// TileProto.lat2y = function( lat )
// {
//     return TILESIZE - TILESIZE / (this.bounds[3] - this.bounds[1]) * (lat - this.bounds[1])
// }
//
// TileProto.project = function( lon, lat )
// {
//
//  var bounds = this.bounds;
//
//  return [
//       (TILESIZE / (bounds[2] - bounds[0]) * (lon - bounds[0]) ),
//       (TILESIZE - TILESIZE / (bounds[3] - bounds[1]) * (lat - bounds[1]) )
//  ]
//
// }


export default Tile;
