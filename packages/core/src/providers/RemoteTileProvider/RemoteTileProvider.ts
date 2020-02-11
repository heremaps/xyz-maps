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

import {JSUtils, geotools} from '@here/xyz-maps-common';
import utils from '../../tile/TileUtils';
import {FeatureProvider} from '../FeatureProvider';
import LoaderManager from '../../loaders/Manager';
import TileReceiver from './TileReceiver';
import tileUtils from '../../tile/TileUtils';
import {Tile} from '../../tile/Tile';
/* exported Options */

import Options from './RemoteTileProviderOptions';

const doc = Options; // doc only!

const DEFAULT_JSON_PARSER = 'native';
let UNDEF;

type TileLoader = any;

/**
 *  Remote tile provider.
 *
 *  @public
 *  @class
 *  @expose
 *  @constructor
 *  @extends here.xyz.maps.providers.FeatureProvider
 *  @param {here.xyz.maps.providers.RemoteTileProvider.Options} config configuration of the provider
 *  @param {Object} defaultConfig
 *  @name here.xyz.maps.providers.RemoteTileProvider
 */
export class RemoteTileProvider extends FeatureProvider {
    sizeKB = 0;

    staticData: boolean;

    renderer: any;

    name: string;

    level: number;

    clipped: boolean;

    loader: TileLoader;

    private _pp: any;

    // protected url: string;

    constructor(config, preprocessor?: (data: any) => boolean) {
        super({
            'minLevel': 8,
            'maxLevel': 20,
            'staticData': false
            // ,'indexed' : config.indexed != UNDEF
            //     ? config.indexed
            //     : true
        }, config);

        const provider = this;

        let loader = config.loader;

        if (loader) {
            if (!(loader instanceof LoaderManager)) {
                loader = new LoaderManager(loader);
            }
        } else {
            throw (new Error('no tile loader defined.'));
        }
        // else {
        //     loader = new LoaderManager(
        //         // new IndexDBLoader( config['url'] ),
        //         new HTTPLoader({
        //             url: config['url'],
        //             withCredentials: config['withCredentials'],
        //             headers: config['headers']
        //             // parser: config['parser'] || DEFAULT_JSON_PARSER,
        //         })
        //     );
        // }

        provider.loader = loader;

        // preprocessor = preprocessor || config.preprocessor;

        if (typeof preprocessor == 'function') {
            provider._pp = preprocessor;
        }
    }

    /**
     *  Cancel a tile request.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.RemoteTileProvider#cancel
     *  @param {string | here.xyz.maps.providers.TileProvider.Tile} quadkey
     *      quadkey of the tile or the tile to cancel request
     */
    cancel(quadkey: string | Tile, cb: () => void) {
        const prov = this;
        const storage = prov.storage;
        const strict = cb == UNDEF;
        let dataTiles;
        let tile;

        if (quadkey instanceof this.Tile) {
            tile = quadkey;
        } else {
            tile = storage.get(quadkey);
        }

        if (tile /* && this.isTileVisible( tile )*/) {
            quadkey = tile.quadkey;

            // get loader tile
            dataTiles = this.calcStorageQuads(<string>quadkey);

            for (let i = 0, dTile, dQuad; i < dataTiles.length; i++) {
                dQuad = dataTiles[i];

                // if tile is directly passed it could be possible,
                // that it's removed already from storage (LRU FULL)..
                // so we use the tile directly instead of using the storage.
                dTile = dQuad == quadkey
                    ? tile
                    : storage.get(dQuad);

                if (dTile) {
                    const onLoaded = dTile.onLoaded;
                    let ci;

                    if (onLoaded) {
                        if (strict) {
                            tile.onLoaded.length = 0;
                        } else {
                            if (prov.level && tile.z != prov.level) {
                                ci = onLoaded.indexOf(tile.onLoaded[0]);

                                if (ci != -1) {
                                    if (!onLoaded[ci].remove(cb)) {
                                        onLoaded.splice(ci, 1);
                                    }
                                }
                            } else {
                                onLoaded.splice(onLoaded.indexOf(cb), 1);
                            }
                        }

                        if (!onLoaded.length) {
                            if (prov.loader.abort(dTile)) {
                                storage.remove(dTile);
                            }
                        }
                    }
                }
            }
        }
    };

    /**
     *  Search for feature in provider.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.RemoteTileProvider#search
     *  @param {Object} options
     *  @param {String=} options.id Object id.
     *  @param {Array.<String>=} options.ids Array of object ids.
     *  @param {here.xyz.maps.geo.Point=} options.point Center point of the circle for search
     *  @param {number=} options.radius Radius of the circle in meters, it is used in "point" search.
     *  @param {(here.xyz.maps.geo.Rect|Array.<number>)=} options.rect Rect object is either an array: [minLon, minLat, maxLon, maxLat] or Rect object defining rectangle to search in.
     *  @param {Boolean=} options.remote Force the provider to do remote search if objects are not found in cache.
     *  @param {Function=} options.onload callback function of search.
     *  @param {Function=} options.onerror callback function for errors.
     *  @example
     * //searching by id:
     *provider.search({id: 1058507462})
     * //or:
     *provider.search({ids: [1058507462, 1058507464]})
     *@example
     * //searching by point and radius:
     *provider.search({
     *  point: {longitude: 72.84205, latitude: 18.97172},
     *  radius: 100
     *})
     *@example
     * //searching by Rect:
     *provider.search({
     *  rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876}
     *})
     *@example
     * //remote search:
     *provider.search({
     *  rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876},
     *  remote: true, // force provider to do remote search if feature/search area is not cached locally
     *  onload: function(e){
     *   // search result is only return in this callback function if no features is found in cache.
     *  }
     *})
     *  @return {Array.<here.xyz.maps.providers.RemoteTileProvider.Feature>} array of features
     */

    // search( { rect: bbox || point: point || id: id || ids:[], radius: 1, onload: function(){}, remote: true } )
    // search( bbox||point||objID, { radius: 1, onload: function(){}, remote: true } )

    // TODO: cleanup and split search and implement remote part here
    search(bbox, options?) {
        const provider = this;
        let geo;
        let searchBBox;

        if (typeof bbox == 'object') {
            if (!options) {
                options = bbox;
            } else {
                for (const opt in bbox) {
                    options[opt] = bbox[opt];
                }
            }
        }

        options = options || {};

        const onload = options['onload'];
        let radius = options['radius'];
        const remote = options['remote'];
        const onerror = options['onerror'];

        if (radius == UNDEF) {
            radius = 1;
        }

        if (bbox instanceof Array) {
            if (bbox.length == 4) { // it's just a point
                searchBBox = bbox; // [ bbox[1], bbox[2], bbox[3], bbox[0] ];
            } else {
                searchBBox = geotools.getPointBBox(<geotools.Point>bbox, radius);
            }
        } else if (typeof bbox == 'number' || typeof bbox == 'string' || !bbox) { // search per ID
            return provider.getFeatures(bbox, options);
        } else if (bbox['longitude'] != UNDEF && bbox['latitude'] != UNDEF) {
            searchBBox = geotools.getPointBBox(
                [bbox['longitude'], bbox['latitude']],
                radius
            );
        } else if (
            bbox['minLon'] != UNDEF &&
            bbox['minLat'] != UNDEF &&
            bbox['maxLon'] != UNDEF &&
            bbox['maxLat'] != UNDEF
        ) {
            searchBBox = [bbox['minLon'], bbox['minLat'], bbox['maxLon'], bbox['maxLat']];
        } else if (geo = bbox['point'] || bbox['rect'] || bbox['viewport']) {
            return provider.search(geo, options);
        } else if (bbox['id'] || bbox['ids']) {
            return provider.getFeatures(
                bbox['id'] || bbox['ids'],
                options
            );
        }

        searchBBox = {
            minX: searchBBox[0],
            minY: searchBBox[1],
            maxX: searchBBox[2],
            maxY: searchBBox[3]
        };

        if (remote) {
            // var tiles = utils.getTilesInRect.apply(
            //     tileUtils,
            //     searchBBox.concat( provider.level )
            // );
            const tiles = utils.getTilesInRect(
                searchBBox.minX,
                searchBBox.minY,
                searchBBox.maxX,
                searchBBox.maxY,
                provider.level
            );

            let error;
            const tileReceiver = (tile: Tile) => {
                tiles.splice(tiles.indexOf(tile.quadkey), 1);

                error = error || tile.error;

                if (!tiles.length) {
                    // all tile are loaded -> callback is ready to be executed..
                    if (error) {
                        onerror(error);
                    } else if (onload) {
                        onload(provider._s(searchBBox));
                    }
                }
            };

            // filter out tiles that are already cached
            for (let t = 0; t < tiles.length; t++) {
                const qk = tiles[t];
                const cTile = provider.getCachedTile(qk);
                if (cTile && cTile.isLoaded()) {
                    if (cTile.error) {
                        if (onerror) {
                            onerror(cTile.error);
                        }
                        return;
                    }
                    tiles.splice(t--, 1);
                } else {
                    // tile needs to be loaded...
                    provider.getTile(qk, tileReceiver);
                }
            }

            // wait for all required tiles being loaded.
            if (tiles.length) {
                return;
            }
        }

        const result = provider._s(searchBBox);
        // var result =  provider.tree.search( searchBBox );

        if (onload) {
            onload(result);
        }

        return result;
    };


    // setUrl( url )
    // {
    //     this.loader.setUrl( url );
    // };

    getLoader() {
        return this.loader;
    };

    config(cfg) {
        return super.config(cfg);
    };

    clear(tile?) {
        if (arguments.length == 0) {// full wipe!
            this.loader.clear();
        }
        // TODO: add support for partial loader clearance
        super.clear.apply(this, arguments);
    };

    // reset(qk) {
    //     this.storage.resetData(qk);
    // };


    calcStorageQuads(quadkey: string) {
        return utils.getTilesOfLevel(quadkey, this.level);
    };

    // isTileVisible( tile ){
    //
    //     var lvl = tile.z;
    //
    //     return lvl <= this.maxLevel && lvl >= this.minLevel;
    // }


    preprocess(tile, data, allDone) {
        const provider = this;
        const preprocessor = provider._pp;
        let processedData;

        if (typeof preprocessor == 'function') {
            processedData = preprocessor({
                data: data,
                quadkey: tile.quadkey,
                x: tile.x,
                y: tile.y,
                z: tile.z,
                provider: provider,
                ready: allDone
            });
        } else {
            processedData = data;
        }

        if (processedData) {
            allDone(processedData);
        }
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
        const tile = super.createTile(quadkey);
        const tileLevel = tile.z;
        const cacheLevel = this.level;
        let cacheQuad;
        let depQuads;

        if (
            cacheLevel &&
            tileLevel != cacheLevel
        ) {
            if (tileLevel > cacheLevel) {
                cacheQuad = quadkey.substr(0, cacheLevel);

                depQuads = this.dep[cacheQuad];

                if (!depQuads) {
                    depQuads = this.dep[cacheQuad] = [];
                }

                depQuads[depQuads.length] = tile;
            } else if (tileLevel < cacheLevel) {
                const cacheQuads = tileUtils.getTilesOfLevel(quadkey, cacheLevel);

                for (let q = 0, len = cacheQuads.length; q < len; q++) {
                    cacheQuad = cacheQuads[q];

                    depQuads = this.dep[cacheQuad];

                    if (!depQuads) {
                        depQuads = this.dep[cacheQuad] = [];
                    }
                    depQuads[depQuads.length] = tile;
                }
            }
        }

        return tile;
    };

    execTile(tile) {
        const cbs = tile.onLoaded;
        let cb;

        if (cbs) {
            for (var i = 0, l = cbs.length; i < l; i++) {
                cb = cbs[i];

                if (cb instanceof TileReceiver) {
                    cb.receive(tile);
                } else {
                    cb(tile);
                }
            }
            cbs.length = 0;
        }
    }

    private attachData(tile: Tile, data: any[]) {
        const provider = this;
        const unique = [];
        let len = data.length;
        let prepared;
        let inserted;
        let o;

        for (var i = 0; i < len; i++) {
            prepared = provider.prepareFeature(o = data[i]);

            if (prepared !== false) {
                o = prepared;

                inserted = provider._insert(o, tile);

                // filter out the duplicates!!
                if (inserted) {
                    o = inserted;
                    unique[unique.length] = o;
                } else if (/* provider.indexed &&*/ !provider.tree) { // NEEDED FOR MULTI TREE!
                    unique[unique.length] = provider.getFeature(o.id);
                }
            } else {
                // unkown feature
                console.warn('unkown feature detected..', o.geometry.type, o);
                data.splice(i--, 1);
                len--;
            }
        }


        data = unique;


        tile.loadStopTs = Date.now();

        // if( provider.indexed )
        // {
        if (provider.tree) {
            provider.tree.load(data);
        }
        // }

        tile.data = provider.clipped
            ? data
            : provider.search(tile.getContentBounds());


        if (provider.margin) {
            // additional mark in dep tiles is required because actual data of tile is bigger
            // than received data..It may also contain data of neighbour tiles
            for (var d = 0, l = tile.data.length; d < l; d++) {
                provider._mark(tile.data[d], tile);
            }
        }

        provider.execTile(tile);
    }

    getTile(quadkey: string, cb: (tile: Tile, error?: any) => void) {
        const provider = this;
        const storage = provider.storage;
        const storageLevel = provider.level;
        let tile;

        if ((tile = storage.get(quadkey)) == UNDEF) {
            tile = provider.createTile(quadkey);
            tile.onLoaded = [];

            storage.set(tile);
        } else {
            if (tile.isLoaded()) {
                // if( tile.expired() ){
                //     console.log('%c Tile expired','background-color:red;color:white');
                //     provider._removeTile( tile, true );
                //     // provider.storage.remove( tile );
                //     tile.data        = null;
                //     tile.loadStopTs  = null;
                //     tile.loadStartTs = null;
                // }else{
                if (cb) {
                    cb(tile, tile.error);
                }
                return tile;
                // }
            }
        }

        if (quadkey.length != storageLevel) {
            const loaderTiles = provider.calcStorageQuads(quadkey);
            let loaderTile;
            let receiver;

            tile.loadStartTs = Date.now();
            tile.data = [];


            if (!tile.onLoaded.length) {
                receiver = new TileReceiver(tile, loaderTiles);

                tile.onLoaded.push(receiver);
            } else {
                receiver = tile.onLoaded[0];
            }

            receiver.add(cb);

            for (let l = 0; l < loaderTiles.length; l++) {
                loaderTile = storage.get(loaderTiles[l]);


                if (loaderTile == UNDEF) {
                    loaderTile = provider.getTile(loaderTiles[l], receiver);
                } else {// if( loaderTile.onLoaded.indexOf(receiver) == -1 )
                    if (loaderTile.isLoaded()) {
                        receiver.receive(loaderTile);
                    } else if (loaderTile.onLoaded.indexOf(receiver) == -1) {
                        loaderTile.onLoaded.push(receiver);
                    }
                }
            }
        } else {
            // attach the callback
            if (cb) {
                if (tile.onLoaded.indexOf(cb) == -1) {
                    tile.onLoaded.push(cb);
                }
            }

            if (!tile.loadStartTs) {
                tile.loadStartTs = Date.now();

                provider.loader.tile(tile, (data, stringByteSize) => {
                    // console.log('----loadtile---',tile.quadkey);

                    provider.sizeKB += stringByteSize / 1024;

                    provider.preprocess(tile, data, (data) => provider.attachData(tile, data));
                },
                (errormsg) => {
                    tile.loadStopTs = Date.now();

                    tile.error = errormsg;

                    tile.data = [];

                    provider.execTile(tile);

                    provider.listeners.trigger('error', [errormsg], true);
                });
            }

            // else
            //    if(tile.loadStopTs){
            //        exec(tile);
            //    }
        }
        return tile;
    };

    _removeTile(tile: Tile, triggerEvent) {
        super._removeTile(tile, triggerEvent);

        // if tile hasn't been fully loaded already, request needs to be aborted..
        if (!tile.isLoaded()) {
            this.loader.abort(tile);
        }
    };
}

// RemoteTileProvider.prototype.staticData = false;
