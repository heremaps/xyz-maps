/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
import {Tile} from '../tile/Tile';
import LRUStorage from '../storage/LRUStorage';
import GenericLoader from '../loaders/Manager';
import {HTTPLoader} from '../loaders/HTTPLoader';

let UNDEF;

const timestamp = () => +new Date;


/**
 *  Tile Provider for Image/Raster data.
 *  eg: Satellite Tiles.
 */
export class ImageProvider extends TileProvider {
    private loader: GenericLoader;
    name = '';
    /**
     *  The opacity with which the image data should be displayed.
     */
    private opacity: number = 1;
    dataType = 'image';

    /**
     *  @param options - options to configure the provider
     */
    constructor(options) {
        super(options, {
            'storage': new LRUStorage(512)
        });

        const provider = this;

        if (!provider.loader) {
            provider.loader = new GenericLoader(
                new HTTPLoader({
                    url: options['url'],
                    headers: {
                        'Accept': '*/*'
                    }
                })
            );
        }
    }

    /**
     * Get a tile by quadkey.
     *
     * @param quadkey - quadkey of the tile
     * @param callback - the callback function
     * @returns the Tile is returned if its already cached locally
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
     *  Clear tiles in a given bounding box or all tiles called without parameter.
     *
     *  @param bbox - array of geographical coordinates [minLon, minLat, maxLon, maxLat] defining the area to clear.
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
     * Cancel ongoing request(s) and drop the tile.
     *
     * @param quadkey - the quadkey of the tile that should be canceled and removed.
     */
    cancel(quadkey: string ): void;
    /**
     * Cancel ongoing request(s) and drop the tile.
     *
     * @param tile - the tile that should be canceled and removed.
     */
    cancel(tile: Tile): void;
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
