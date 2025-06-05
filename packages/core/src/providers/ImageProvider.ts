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

import TileProvider from './TileProvider/TileProvider';
import {Tile} from '../tile/Tile';
import LRUStorage from '../storage/LRUStorage';
import GenericLoader from '../loaders/Manager';
import {HTTPLoader} from '../loaders/HTTPLoader';
import {TileLoadDelegator} from './RemoteTileProvider/TileLoadDelegator';
import {ImageProviderOptions} from './ImageProviderOptions';

/**
 *  Tile Provider for Image/Raster data.
 *  eg: Satellite Tiles.
 */
export class ImageProvider extends TileProvider {
    name = '';
    /**
     *  The opacity with which the image data should be displayed.
     */
    private opacity: number = 1;
    dataType = 'image';
    private tileLoader: TileLoadDelegator;
    private errorImage: HTMLImageElement;

    /**
     *  @param options - options to configure the provider
     */
    constructor(options: ImageProviderOptions) {
        super({
            storage: new LRUStorage(512),
            ...options
        });

        if (typeof options.errorImage == 'string') {
            const errorImg = new Image();
            errorImg.src = options.errorImage;
            this.errorImage = errorImg;
        }


        const processTileResponse = (tile: Tile, data: any, onDone: (data: any) => void, xhr?: XMLHttpRequest) => {
            if (tile.error) {
                if (this.errorImage) {
                    data = this.errorImage;
                } else if (tile.error.statusCode == 404) {
                    // support for "FileNotFound(404) Image tiles"
                    const {response} = xhr;
                    if (response instanceof Blob && response.type.startsWith('image')) {
                        return HTTPLoader.createImageFromBlob(response, onDone);
                    }
                }
            }
            onDone(data);
        };

        this.tileLoader = new TileLoadDelegator({
            provider: this,
            loader: new GenericLoader(
                new HTTPLoader({
                    url: options['url'],
                    headers: {
                        'Accept': '*/*'
                    },
                    responseType: 'image'
                })
            ),
            preProcessor: options.preProcessor,
            processTileResponse
        });
    }


    /**
     * Get a tile by quadkey.
     *
     * @param quadkey - quadkey of the tile
     * @param callback - the callback function
     * @returns the Tile is returned if its already cached locally
     */
    getTile(quadkey: string, cb: (tile: Tile) => void) {
        return this.tileLoader.getTile(quadkey, cb);
    };

    _removeTile(tile: Tile) {
        this.tileLoader.drop(tile);
    };

    /**
     * Cancel ongoing request(s) and drop the tile.
     *
     * @param quadkey - the quadkey of the tile that should be canceled and removed.
     */
    cancel(quadkey: string): void;
    /**
     * Cancel ongoing request(s) and drop the tile.
     *
     * @param tile - the tile that should be canceled and removed.
     */
    cancel(tile: Tile): void;
    cancel(quadkey: string | Tile) {
        return this.tileLoader.cancel(quadkey);
    };
}

ImageProvider.prototype.__type = 'ImageProvider';
