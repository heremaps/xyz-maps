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

import {FeatureProvider} from '../FeatureProvider';
import LoaderManager from '../../loaders/Manager';
import {Tile} from '../../tile/Tile';
import {GeoJSONFeature} from '../../features/GeoJSON';
import {RemoteTileProviderOptions} from './RemoteTileProviderOptions';
import {FixedLevelTileLoadDelegator} from './FixedLevelTileLoadDelegator';

/**
 *  A remote tile provider fetches data from remote data-sources.
 */
export class RemoteTileProvider extends FeatureProvider {
    sizeKB = 0;

    staticData: boolean;

    renderer: any;

    name: string;

    level: number;

    clipped: boolean;

    private remoteTileLoader: FixedLevelTileLoadDelegator;

    /**
     * @param options - options to configure the provider
     */
    constructor(options: RemoteTileProviderOptions) {
        super(<any>{
            minLevel: 8,
            maxLevel: 20,
            staticData: false,
            ...options
        });

        const provider = this;


        let loader = options.loader;

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


        const {preProcessor} = options;
        this.remoteTileLoader = new FixedLevelTileLoadDelegator({
            provider,
            loader,
            level: provider.level,
            preProcessor,
            processTileResponse: (tile, data, onDone, xhr) => this.attachData(tile, data, onDone, xhr)
        });
    }

    /**
     * Cancel ongoing request(s) of a tile.
     * The tile will be dropped.
     *
     * @param quadkey - the quadkey of the tile that should be canceled and removed.
     */
    cancel(quadkey: string): void;
    /**
     * Cancel ongoing request(s) of a tile.
     * The tile will be dropped.
     *
     * @param tile - the tile that should be canceled and removed.
     */
    cancel(tile: Tile): void;
    cancel(tile: Tile | string, cb?): void;
    cancel(quadkey: string | Tile, cb?: () => void) {
        this.remoteTileLoader.cancel(quadkey, cb);
    };

    getLoader() {
        return this.remoteTileLoader.loader;
    };

    config(cfg) {
        return super.config(cfg);
    };

    clear(tile?) {
        if (arguments.length == 0) {// full wipe!
            this.remoteTileLoader.clear();
        }
        // TODO: add support for partial loader clearance
        super.clear.apply(this, arguments);
    };

    private attachData(tile: Tile, data: any[], onDone: (data: any) => void, xhr: XMLHttpRequest) {
        const provider = this;
        const unique = [];
        let len = data.length;
        let prepared;
        let inserted;
        let o;

        if (tile.error) {
            return onDone(tile.data);
        }

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

        data = provider.clipped
            ? data
            : provider.search(tile.getContentBounds());

        onDone(data);
        // if (provider.margin) {
        //     // additional mark in dep tiles is required because actual data of tile is bigger
        //     // than received data..It may also contain data of neighbour tiles
        //     for (var d = 0, l = tile.data.length; d < l; d++) {
        //         provider._mark(tile.data[d], tile);
        //     }
        // }
        // provider.execTile(tile);
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
    getTile(quadkey: string, cb: (tile: Tile) => void) {
        return this.remoteTileLoader.getTile(quadkey, cb);
    }

    _removeTile(tile: Tile, triggerEvent) {
        this.remoteTileLoader.drop(tile);

        super._removeTile(tile, triggerEvent);
    };
}
