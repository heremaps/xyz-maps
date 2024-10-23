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


import LoaderManager from '../../loaders/Manager';
import TileReceiver from './TileReceiver';
import {Tile} from '../../tile/Tile';
import {createRemoteProcessor} from './processors';
import TileProvider from '../TileProvider/TileProvider';

let UNDEF;

type TileLoader = any;

type PreProcessor = (input: {
    data: any,
    ready: (features: any) => void,
    tile?: { x: number, y: number, z: number }
}) => (any | Promise<any>)

export class TileLoadDelegator {
    provider: TileProvider;
    protected preprocess: (data: any, ready, tile?: Tile) => void;

    loader: TileLoader;

    constructor(options: {
        provider: TileProvider, loader: TileLoader, preProcessor?: PreProcessor,
        processTileResponse?: (tile: Tile, data: any, onDone: (data: any) => void, xhr: XMLHttpRequest) => any
    }) {
        let {loader} = options;

        if (loader) {
            if (!(loader instanceof LoaderManager)) {
                loader = new LoaderManager(loader);
            }
        } else {
            throw (new Error('no tile loader defined.'));
        }

        this.loader = loader;
        this.provider = options.provider;

        this.initPreprocessor(options.preProcessor);

        if (typeof options.processTileResponse == 'function') {
            this.processTileResponse = options.processTileResponse;
        }
    }

    initPreprocessor(preProcessor: PreProcessor) {
        this.preprocess = createRemoteProcessor(preProcessor, this.provider);
    }

    clear() {
        this.loader.clear();
    }

    cancel(quadkey: string | Tile, cb?: () => void) {
        const prov = this.provider;
        const storage = prov.storage;
        const strict = cb == UNDEF;
        // let dataTiles;
        let tile;

        if (quadkey instanceof prov.Tile) {
            tile = quadkey;
        } else {
            tile = storage.get(quadkey);
        }

        if (tile /* && this.isTileVisible( tile )*/) {
            const {onLoaded} = tile;

            if (onLoaded) {
                if (strict) {
                    onLoaded.length = 0;
                } else {
                    onLoaded.splice(onLoaded.indexOf(cb), 1);
                }

                if (!onLoaded.length) {
                    if (this.loader.abort(tile)) {
                        storage.remove(tile);
                    }
                }
            }
        }
    };

    protected execTile(tile) {
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

    protected processTileResponse(tile: Tile, data: any, onDone: (data: any) => void, xhr?: XMLHttpRequest) {
        onDone(data);
    }

    protected handleTileResponse(tile: Tile, data: any, xhr?: XMLHttpRequest, onDone?: () => void) {
        const proccessd = (data: any) => {
            tile.data = data;
            this.execTile(tile);
            if (onDone) onDone();
        };

        tile.loadStopTs = Date.now();

        this.processTileResponse(tile, data, proccessd, xhr);
    }

    protected completeTile(tile: Tile, data?: any) {
        this.handleTileResponse(tile, data);
    }

    /**
     * Get a tile by quadkey.
     * If the tile is not cached already, it will be created and stored automatically.
     * Data will be fetched from remote data-sources and attached to tile automatically
     *
     * @param quadkey - quadkey of the tile
     * @param callback - will be called as soon as tile is ready for consumption
     * @returns the Tile
     */
    getTile(quadkey: string, callback: (tile: Tile, error?: any) => void) {
        const provider = this.provider;
        const storage = provider.storage;
        // const storageLevel = provider.level;
        let tile;

        if ((tile = storage.get(quadkey)) == UNDEF) {
            tile = provider.createTile(quadkey);
            tile.onLoaded = [];
            tile.data = [];

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
                if (callback) {
                    callback(tile, tile.error);
                }
                return tile;
                // }
            }
        }

        // attach the callback
        if (callback) {
            if (tile.onLoaded.indexOf(callback) == -1) {
                tile.onLoaded.push(callback);
            }
        }

        if (!tile.loadStartTs) {
            tile.loadStartTs = Date.now();

            this.loader.tile(tile, (data, stringByteSize) => {
                // console.log('----loadtile---',tile.quadkey);
                // provider.sizeKB += stringByteSize / 1024;
                this.preprocess(data, (data) => this.completeTile(tile, data), tile);
            },
            (err, xhr: XMLHttpRequest) => {
                // tile.loadStopTs = Date.now();

                tile.error = err;

                this.handleTileResponse(tile, undefined, xhr, () => provider.listeners.trigger('error', [err, tile], true));
            });
        }
        return tile;
    };

    drop(tile: Tile) {
        this.provider.storage.remove(tile);
        if (!tile.isLoaded()) {
            this.loader.abort(tile);
        }
    }


    // _removeTile(tile: Tile, triggerEvent) {
    //     this.provider.storage.remove(tile);
    //     // if tile hasn't been fully loaded already, request needs to be aborted..
    //     if (!tile.isLoaded()) {
    //         this.loader.abort(tile);
    //     }
    // };
}

// RemoteTileProvider.prototype.staticData = false;
