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


import TileReceiver from './TileReceiver';
import {Tile} from '../../tile/Tile';
import {getTilesOfLevel} from '../../tile/TileUtils';
import TileProvider from '../TileProvider/TileProvider';
import {TileLoadDelegator} from './TileLoadDelegator';

let UNDEF;

type TileLoader = any;


export class FixedLevelTileLoadDelegator extends TileLoadDelegator {
    private level: number;
    private dep: { [quadkey: string]: Tile[] } = {};
    private ignoreTileQueryLimit: boolean;

    constructor(options: {
      level: number,
      ignoreTileQueryLimit?: boolean,
      provider: TileProvider,
      loader: TileLoader,
      preProcessor?: (input: {
        data: any,
        ready: (features: any) => void,
        tile?: { x: number, y: number, z: number }
      }) => (any | Promise<any>),
      processTileResponse: (tile: Tile, data: any, onDone: (data: any) => void, xhr: XMLHttpRequest) => any
    }) {
        super(options);
        this.level = options.level;
        this.ignoreTileQueryLimit = options.ignoreTileQueryLimit || false;
    }

    cancel(quadkey: string | Tile, cb?: () => void) {
        const prov = this.provider;
        const storage = prov.storage;
        const strict = cb == UNDEF;
        let dataTiles;
        let tile;

        if (quadkey instanceof prov.Tile) {
            tile = quadkey;
        } else {
            tile = storage.get(quadkey);
        }

        if (tile /* && this.isTileVisible( tile )*/) {
            quadkey = tile.quadkey;

            // get loader tile
            dataTiles = getTilesOfLevel(<string>quadkey, this.level);

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
                            if (this.loader.abort(dTile)) {
                                storage.remove(dTile);
                            }
                        }
                    }
                }
            }
        }
    };

    clear() {
        super.clear();
        this.dep = {};
    }

    private createTile(quadkey: string): Tile {
        const tile = this.provider.createTile(quadkey);
        const tileLevel = tile.z;
        const cacheLevel = this.level;
        let cacheQuads;
        let depQuads;

        if (cacheLevel && tileLevel != cacheLevel) {
            if (tileLevel > cacheLevel) {
                cacheQuads = [quadkey.substr(0, cacheLevel)];
            } else if (tileLevel < cacheLevel) {
                cacheQuads = getTilesOfLevel(quadkey, cacheLevel);
            }

            if (cacheQuads) {
                for (let q = 0, len = cacheQuads.length; q < len; q++) {
                    let cacheQuad = cacheQuads[q];

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

    private blockedLevels: { [level: number]: number } = {};

    getTile(quadkey: string, callback: (tile: Tile, error?: any) => void) {
        const provider = this.provider;
        const storage = provider.storage;
        const storageLevel = this.level;

        let tile;

        if ((tile = storage.get(quadkey)) == UNDEF) {
            tile = this.createTile(quadkey);
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

        const addSimpleOnLoadCallback = (tile, callback) => {
            if (!callback) return;
            if (tile.onLoaded.indexOf(callback) == -1) {
                tile.onLoaded.push(callback);
            }
        };

        const requestedLevel = quadkey.length;

        if (requestedLevel != storageLevel) {
            tile.loadStartTs = Date.now();

            if (!this.ignoreTileQueryLimit && storageLevel > requestedLevel) {
                if (!this.blockedLevels[requestedLevel]) {
                    this.blockedLevels[requestedLevel] = 1;
                    console.warn(`The request for all tiles from level ${requestedLevel} was denied because the TileProvider is set to level ${storageLevel}, leading to an excessive number of tile requests.`);
                }

                addSimpleOnLoadCallback(tile, callback);
                setTimeout(() => this.completeTile(tile, []), 0);
                return tile;
            }

            const loaderTiles = getTilesOfLevel(quadkey, storageLevel);
            let loaderTile;
            let receiver;

            if (!tile.onLoaded.length) {
                receiver = new TileReceiver(tile, loaderTiles);

                tile.onLoaded.push(receiver);
            } else {
                receiver = tile.onLoaded[0];
            }

            receiver.add(callback);

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
            addSimpleOnLoadCallback(tile, callback);

            if (!tile.loadStartTs) {
                tile.loadStartTs = Date.now();

                this.loader.tile(tile, (data) => {
                    this.preprocess(data, (data) => this.completeTile(tile, data), tile);
                },
                (error, xhr) => {
                    tile.error = error;
                    this.handleTileResponse(tile, undefined, xhr, () => provider.listeners.trigger('error', [error, tile], true));
                });
            }
        }

        return tile;
    };

    drop(tile: Tile) {
        const qk = tile.quadkey;
        const storage = this.provider.storage;
        let depTiles;

        if (depTiles = this.dep[qk]) {
            for (var d = 0; d < depTiles.length; d++) {
                storage.remove(depTiles[d]);
            }
            delete this.dep[qk];
        }

        super.drop(tile);
    }
}
