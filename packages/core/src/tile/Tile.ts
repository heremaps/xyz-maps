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

import {quadToGrid, getGeoBounds} from './TileUtils';
import rbush from 'rbush';
import projection from '../projection/webMercator';

const TILESIZE = 256;

const NULL = null;

type Bounds = [number, number, number, number];

/**
 *  Tile.
 *
 *  @class
 *  @expose
 *  @public
 *
 *  @param {String} quadkey
 *  @param {String} type type of tile
 *  @name here.xyz.maps.providers.TileProvider.Tile
 */
export class Tile {
    constructor(quadkey: string, type: string, expire?: number) {
        const grid = quadToGrid(quadkey);

        /**
         *  quadkey of this tile.
         *
         *  @public
         *  @expose
         *  @type {String}
         *  @name here.xyz.maps.providers.TileProvider.Tile#quadkey
         */
        this.quadkey = quadkey;
        /**
         *  z of the tile. (level)
         *
         *  @public
         *  @expose
         *  @type {Integer}
         *  @name here.xyz.maps.providers.TileProvider.Tile#z
         */
        this.z = grid[0];
        /**
         *  y of the tile.
         *
         *  @public
         *  @expose
         *  @type {Integer}
         *  @name here.xyz.maps.providers.TileProvider.Tile#y
         */
        this.y = grid[1];
        /**
         *  x of the tile.
         *
         *  @public
         *  @expose
         *  @type {Integer}
         *  @name here.xyz.maps.providers.TileProvider.Tile#x
         */
        this.x = grid[2];

        /**
         *  type of the tile.
         *
         *  @public
         *  @expose
         *  @type {String}
         *  @name here.xyz.maps.providers.TileProvider.Tile#type
         */
        this.type = type;

        this.expire = expire;

        /**
         *  Bounding box has the coordinates in order: [minLon, minLat, maxLon, maxLat].
         *
         *  @public
         *  @expose
         *  @type {Array<Integer>}
         *  @name here.xyz.maps.providers.TileProvider.Tile#bounds
         */
        this.bounds = getGeoBounds(grid[0], grid[1], grid[2]);
    }


    quadkey: string;

    z: number;

    y: number;

    x: number;

    type: string;

    bounds: Bounds;


    data: any;
    loadStartTs: number;
    loadStopTs: number;
    error: {};
    provider: any;
    onLoaded: any;

    cbnds: Bounds;

    private tree: any;


    private expire: number;

    /**
     *  Checks if tile expires at given time point. by default, check if the tile expires at the time point when this function is called.
     *
     *  @public
     *  @expose
     *  @param {Date=} ts
     *  @name here.xyz.maps.providers.TileProvider.Tile#expired
     *  @return {boolean} tile expires returns true, otherwise false.
     */
    expired(ts: number) {
        ts = ts || Date.now();
        return ts - this.loadStopTs > this.expire * 1000;
    };


    /**
     *  add feature to tile.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.TileProvider.Tile#add
     *  @param {here.xyz.maps.providers.FeatureProvider.Feature} feature
     */
    add(feature: any) {
        const data = this.data;

        if (data && data.indexOf(feature) == -1) {
            data.push(feature);

            if (this.tree) {
                this.tree.insert(feature);
            }
        }
    };

    /**
     *  remove feature to tile.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.TileProvider.Tile#remove
     *  @param {here.xyz.maps.providers.FeatureProvider.Feature} feature
     */
    remove(feature: any) {
        const tileIndex = this.data.indexOf(feature);

        if (tileIndex !== -1) {
            this.data.splice(tileIndex, 1);

            if (this.tree) {
                this.tree.remove(feature);
            }
        }
    };

    // /**
    //  *  search for features by bounding box in the tile.
    //  *
    //  *  @public
    //  *  @expose
    //  *  @function
    //  *  @name here.xyz.maps.providers.TileProvider.Tile#search
    //  *  @param {Array.<Integer>} bbox the bounding box has the coordinates in the order: [minX, minY, maxX, maxY]
    //  *  @return {here.xyz.maps.providers.FeatureProvider.Feature}
    //  */
    search(bbox: number[]): any[] {
        if (this.data) {
            if (!this.tree) {
                // console.time('create tile index ' + this.quadkey);
                this.tree = rbush(9, ['.bbox[0]', '.bbox[1]', '.bbox[2]', '.bbox[3]']);
                this.tree.load(this.data);
                // console.timeEnd('create tile index ' + this.quadkey);
            }
            return this.tree.search(bbox);
        }
    };

    /**
     *  validate if the tile is loaded
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.TileProvider.Tile#isLoaded
     *  @return {Boolean}
     */
    isLoaded(): boolean {
        return typeof this.loadStopTs == 'number';
    };


    /**
     *  get tile bound including margin.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.TileProvider.Tile#getContentBounds
     *  @return {Array.<Number>} the bounding box has the coordinates in the order: [minLon, minLat, maxLon, maxLat]
     */
    // includes margin
    getContentBounds(): number[] {
        if (!this.cbnds) {
            const bounds = this.bounds;
            const margin = this.provider.margin;

            if (margin) {
                // var dLon   = (bounds[2] - bounds[0]) / TILESIZE * margin;
                // var dLat   = (bounds[3] - bounds[1]) / TILESIZE * margin;
                //
                // this.cbnds = [
                //  bounds[0] - dLon,
                //  bounds[1] - dLat,
                //  bounds[2] + dLon,
                //  bounds[3] + dLat
                // ];

                const worldsize = TILESIZE << this.z;
                const x = projection.lon2x(bounds[0], worldsize);
                const y = projection.lat2y(bounds[1], worldsize);

                this.cbnds = [
                    projection.x2lon(x - margin, worldsize),
                    projection.y2lat(y + margin, worldsize),
                    projection.x2lon(x + margin + TILESIZE, worldsize),
                    projection.y2lat(y - margin - TILESIZE, worldsize)
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

        return Math.round(projection.lon2x(lon, worldsize) - tileX);
    };

    lat2y(lat: number, height: number = TILESIZE): number {
        const worldsize = height << this.z;
        const tileY = this.y * height;

        return Math.round(projection.lat2y(lat, worldsize) - tileY);
    };

    isInside(point: [number, number, number?]) {
        const rect = this.bounds;
        const x = point[0];
        const y = point[1];
        return x > rect[0] && x <= rect[2] && y > rect[1] && y <= rect[3];
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
