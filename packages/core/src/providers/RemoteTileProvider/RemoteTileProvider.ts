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
            ignoreTileQueryLimit: options.ignoreTileQueryLimit,
            preProcessor,
            processTileResponse: (tile, data, onDone) => {
                if (tile.error) {
                    return onDone(tile.data);
                }
                this.insertTileData(tile, data, onDone);
            }
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
        return super.clear.apply(this, arguments);
    };

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
