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

import {Tile} from '../../tile/Tile';
import TileStorage from '../../storage/Level2Storage';
import {Listener} from '@here/xyz-maps-common';
/* exported Options */

import Options from './TileProviderOptions';

const doc = Options; // doc only!

const TILESIZE = 256;
const DEFAULT_EXPIRE_SECONDS = Infinity;
let UNDEF;

const intersectBBox = (ax, ax2, ay, ay2, bx, bx2, by, by2) => {
    return ax <= bx2 && bx <= ax2 && ay <= by2 && by <= ay2;
};

/**
 *  Provider.
 *
 *  @public
 *  @class
 *  @expose
 *  @constructor
 *  @param {here.xyz.maps.providers.TileProvider.Options} options
 *  @name here.xyz.maps.providers.TileProvider
 */
abstract class TileProvider {
    __type: string;

    margin = 0;

    id: string;

    dep = {};

    level: number;

    Tile = Tile;

    size = TILESIZE;

    storage: TileStorage;

    expire = DEFAULT_EXPIRE_SECONDS;

    listeners: Listener;

    protected abstract dataType: string;

    abstract _removeTile(tile: Tile, triggerEvent: boolean);

    abstract getTile(quadkey: string, cb: (tile: Tile, error?: any) => void);

    constructor(options, cfg) {
        const provider = this;

        options = options || {};

        for (var c in cfg) {
            options[c] = cfg[c];
        }

        /**
         *  default tile margin.
         *
         *  @public
         *  @expose
         *  @type {Integer}
         *  @name here.xyz.maps.providers.TileProvider#margin
         */
        /**
         *  Provider name.
         *
         *  @public
         *  @expose
         *  @type {String}
         *  @name here.xyz.maps.providers.TileProvider#name
         */
        /**
         *  url for requesting tiles.
         *
         *  @public
         *  @expose
         *  @type {String}
         *  @name here.xyz.maps.providers.TileProvider#url
         */
        /**
         *  provider request tiles at this zoomlevel.
         *
         *  @public
         *  @expose
         *  @type {Integer}
         *  @name here.xyz.maps.providers.TileProvider#level
         */

        for (var c in options) {
            this[c] = options[c];
        }

        /**
         *  Provider id.
         *
         *  @public
         *  @expose
         *  @type {String}
         *  @name here.xyz.maps.providers.TileProvider#id
         */
        if (this.id == UNDEF) {
            this.id = 'TP-' + (Math.random() * 1e6 ^ 0);
        }

        provider.storage = options.storage || new TileStorage(provider.level);

        provider.initStorage(provider.storage);

        // this.storage = new TileStorage( this['minLevel'], this['level'] );

        this.listeners = new Listener([
            'featureAdd',
            'featureRemove',
            'featureCoordinatesChange',
            'clear',
            'error'
        ]);
    };

    initStorage(storage: TileStorage) {
        // if cachelevel/loadinglevel is defined we need to make sure all respective subtiles get cleared.
        storage.onDrop(
            // make sure tile drop also works in case of storage is shared between multiple providers
            (tile) => tile.provider._removeTile(tile)
        );
    };

    /**
     *  Add event listener to provider, valid events: "featureAdd", "featureRemove", "featureCoordinatesChange", "clear" and "error"
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.TileProvider#addEventListener
     */
    addEventListener(key: string, callback: (...args: any[]) => void, context: any) {
        return this.listeners.add(key, callback, context);
    }

    /**
     *  Remove event listener from provider, valid events: "featureadd", "featureRemove", "featureCoordinatesChange", "clear" and "error"
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.TileProvider#removeEventListener
     */
    removeEventListener(key: string, callback: (...args: any[]) => void, context: any) {
        return this.listeners.remove(key, callback, context);
    }

    /**
     *  Clear all features.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.TileProvider#clear
     */
    clear(bbox?) {
        this.storage.clear();
    };

    /**
     *  get cached tile by quadkey.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.TileProvider#getCachedTile
     *  @param {String} quadkey
     *  @return {here.xyz.maps.providers.TileProvider.Tile}
     */
    getCachedTile(quadkey: string): Tile {
        return this.storage.get(quadkey);
    };


    /**
     *  set tile margin.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.TileProvider#setMargin
     *  @param {Integer} margin in pixel
     */
    setMargin(margin) {
        this.margin = Number(margin);

        // clear cached content bounds of tile to allow margin update
        this.storage.forEach((tile) => tile.cbnds = null);
    };

    /**
     *  get cached tile by bounding box.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.TileProvider#getCachedTilesOfBBox
     *  @param {Array.<Number>} bbox array of coordinates in order: [minLon, minLat, maxLon, maxLat]
     *  @param {Integer=} level get tiles at specified level
     *  @return {Array.<here.xyz.maps.providers.TileProvider.Tile>} array of tiles
     */
    getCachedTilesOfBBox(bbox, level?: number) {
        const minLon = bbox[0];
        const minLat = bbox[1];
        const maxLon = bbox[2];
        const maxLat = bbox[3];
        const tiles = [];

        level = level ^ 0;

        this.storage.forEach((tile) => {
            const tBounds = tile.getContentBounds();
            if (
                intersectBBox(
                    tBounds[0], tBounds[2], tBounds[1], tBounds[3],
                    minLon, maxLon, minLat, maxLat
                )
                && (!level || tile.z == level)
            ) {
                tiles[tiles.length] = tile;
            }
        });

        return tiles;
    };

    /**
     *  set config for provider.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.TileProvider#config
     *  @param {here.xyz.maps.providers.TileProvider.Options} cfg
     *  @return {here.xyz.maps.providers.TileProvider}
     */
    config(cfg) {
        cfg = cfg || {};

        for (const c in cfg) {
            this.config[c] = cfg[c];
        }

        return this;
        // return JSON.parse(JSON.stringify(config));
    };

    /**
     *  create tile.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.TileProvider#createTile
     *  @param {String} quadkey
     *  @__param {String} dataType datatype can be "json" or "image" etc.
     *  @return {here.xyz.maps.providers.TileProvider.Tile} created tile
     */
    createTile(quadkey: string /* ,dataType*/) {
        const tile = new this.Tile(
            quadkey,
            this.dataType,
            this.expire
        );

        tile.provider = this;

        return tile;
    };
}

TileProvider.prototype.__type = 'Provider';

export default TileProvider;
