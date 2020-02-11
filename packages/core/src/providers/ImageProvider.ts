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

import TileProvider from './TileProvider/TileProvider';
import {JSUtils} from '@here/xyz-maps-common';
import {Tile} from '../tile/Tile';
import LRUStorage from '../storage/LRUStorage';
import GenericLoader from '../loaders/Manager';
import {HTTPLoader} from '../loaders/HTTPLoader';

let UNDEF;

//    function RingBuffer(length){
//        var pointer = 0,
//            buffer = [];
//
//        var getPointer = 0;
//
//        this.get  = function(key){
//            return buffer[key]
//        }
//        this.next = function(){
//            var p = getPointer;
//            getPointer = (length + getPointer +1) % length;
//            return buffer[p];
//        }
//        this.push = function(item){
//            buffer[pointer] = item;
//            pointer = (length + pointer +1) % length;
//        }
//        this.increase = function(){
//            length++;
//        }
//    };


function timestamp() {
    return +new Date;
}


/**
 *  Image provider
 *
 *  @public
 *  @class
 *  @expose
 *  @constructor
 *  @extends here.xyz.maps.providers.TileProvider
 *  @param {here.xyz.maps.providers.RemoteTileProvider.Options} config configuration of the provider
 *  @name here.xyz.maps.providers.ImageProvider
 */
export class ImageProvider extends TileProvider {
    private loader: GenericLoader;
    private name = '';
    private opacity = 1;
    dataType = 'image';

    constructor(config, tileLoader) {
        super(config, {
            'storage': new LRUStorage(512)
        });

        const provider = this;

        if (!provider.loader) {
            provider.loader = new GenericLoader(
                new HTTPLoader({
                    url: config['url'],
                    headers: {
                        'Accept': '*/*'
                    }
                })
            );
        }

        // provider.renderer = config.renderer;

        /**
         *  Name of this image provider
         *
         *  @public
         *  @expose
         *  @type {string}
         *  @name here.xyz.maps.providers.ImageProvider#name
         */
        // provider.name = config.name || '';

        /**
         *  Opacity of images rendered in this layer
         *
         *  @public
         *  @expose
         *  @type {number}
         *  @name here.xyz.maps.providers.ImageProvider#opacity
         */
        // provider.opacity = config.opacity || 1;
    }


    /**
     *  Get a tile by quad key.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.ImageProvider#getTile
     *  @param {number} quadkey
     *  @param {Function} cb
     *  @return {here.xyz.maps.providers.TileProvider.Tile}
     */

    getTile(quadkey: string, cb: (tile: Tile) => void) {
        const provider = this;
        const loader = provider.loader;
        const storage = provider.storage;

        let tile;

        if ((tile = storage.get(quadkey)) === UNDEF) {
            storage.set(
                tile = provider.createTile(quadkey)
            );
            tile.onLoaded = [];
        }


        if (!tile.loadStopTs) {
            if (cb) {
                if (tile.onLoaded.indexOf(cb) == -1) {
                    tile.onLoaded.push(cb);
                }
                // tile.onLoaded[_cbID || Math.random()] = cb;
            }
        } else {
            if (cb) {
                cb(tile);
            }
            return tile;
        }


        if (!tile.loadStartTs) {
            tile.loadStartTs = timestamp();

            loader.tile(tile, (data) => {
                tile.loadStopTs = timestamp();
                tile.data = data;

                for (let onload of tile.onLoaded) {
                    onload(tile);
                }
                tile.onLoaded = UNDEF;
            },
            (e) => {
                tile.loadStopTs = timestamp();
                tile.error = e;
            });
        }
        return tile;
    };


    _removeTile(tile: Tile) {
        // if tile hasn't been fully loaded already, request needs to be aborted..
        if (!tile.isLoaded()) {
            this.storage.remove(tile);

            this.loader.abort(tile);
        }
    };

    getLoader() {
        return this.loader;
    };

    /**
     *  Clear tiles in bounding box, clear all if parameter is not given
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.ImageProvider#clear
     *  @param {Array.<Number>=} tile bbox array of coordinates in order: [minLon, minLat, maxLon, maxLat]
     */
    clear(bbox?: number[]) {
        const provider = this;
        let dataQuads = null;

        if ( // wipe all cached tiles containing provided bbox
            bbox instanceof Array
        ) {
            dataQuads = provider.getCachedTilesOfBBox(bbox, provider.level);

            for (let d = 0, tile; d < dataQuads.length; d++) {
                tile = dataQuads[d];

                provider.storage.remove(tile);

                dataQuads[d] = tile.quadkey;
            }
        } else if (arguments.length == 0) {
            this.storage.clear();
        }

        provider.listeners.trigger('clear', [provider, dataQuads], true);
    };

    /**
     *  Cancel request of a tile.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.ImageProvider#cancel
     *  @param {here.xyz.maps.providers.TileProvider.Tile|string} quadkey quad key of a tile or a tile instance
     */
    cancel(quadkey: string | Tile) {
        let tile;

        if (quadkey instanceof Tile) {
            tile = quadkey;
        } else {
            tile = this.storage.get(quadkey);
        }

        if (tile) {
            this._removeTile(tile);
        }
    };
}

ImageProvider.prototype.__type = 'ImageProvider';
