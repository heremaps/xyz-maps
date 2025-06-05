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

import {MVTProvider} from '../providers/MVTProvider/MVTProvider';
import OSMStyle from '../styles/OSMStyle';
import MVTTileLoader from '../loaders/MVT/MVTLoader';
import TileStorage from '../storage/Level2Storage';
import {LRU} from '@here/xyz-maps-common';
import {TileLayer, DEFAULT_LAYER_MAX_ZOOM} from './TileLayer';
import {Tile} from '../tile/Tile';
import {MVTLayerOptions} from './MVTLayerOptions';
import {parseTileSize} from './TileLayerOptions';

const DEFAULT_TILE_SIZE = 512;

/**
 * The MVTLayer is a TileLayer designed to work with remote datasources that are delivering {@link https://github.com/mapbox/vector-tile-spec | MVT encoded} vector tiles.
 * @example
 * ```
 * const myLayer = new MVTLayer({
 *     remote: {
 *         url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
 *         tileSize : 512
 *     },
 *     min: 1,
 *     max: 20
 * })
 * ```
 */
export class MVTLayer extends TileLayer {
    protected _p: MVTProvider[];

    adaptiveGrid = true;
    /**
     * @param options - options to configure the TileLayer
     */
    constructor(options: MVTLayerOptions) {
        // let tileStorage = new TileStorage( level - levelOffset, 16, 16 * 4 );

        const remote = options['remote'];
        const url = remote['url'];
        const remoteMin = remote['min'] || 1;
        const remoteMax = remote['max'] || 16;
        const name = options['name'] || '';
        const layerMax = options['max'] || DEFAULT_LAYER_MAX_ZOOM;
        const loader = new MVTTileLoader(remote);
        let tileSize = options['tileSize']||remote['tileSize'];
        let providers = options.providers;
        let levelOffset;

        tileSize ||= parseTileSize(url as string) || DEFAULT_TILE_SIZE;

        if (!Array.isArray(providers)) {
            providers = [];
            // levelOffset = Math.round(Math.log(tileSize) / Math.LN2 - 8);
            levelOffset = 0;
            // 128tiles (512px) -> about 512MB mem!, 256tiles(256px), 64tiles(10240px)...
            let cache1: LRU<Tile> = new LRU(256 / Math.pow(2, levelOffset));
            let cache2: LRU<Tile> = new LRU(cache1.max * 4);

            for (var level = remoteMin; level <= remoteMax; level++) {
                providers.push({
                    min: level,
                    max: level == remoteMax ? layerMax : level,
                    provider: new MVTProvider({
                        name: name + '-L' + level,
                        url: url,
                        level: level - levelOffset,
                        loader: loader,
                        size: tileSize,
                        // storage : tileStorage
                        // storage : new TileStorage( level - levelOffset, 16, 16 * 4 )
                        storage: new TileStorage(level - levelOffset, cache1, cache2)
                    })
                });
            }
        }

        super({
            min: remoteMin,
            max: layerMax,
            style: OSMStyle,
            margin: 0,
            pointerEvents: false,
            ...options,
            tileSize,
            providers
        });
    }

    getProvider(zoom): MVTProvider {
        const z = Math.floor(zoom) - this.levelOffset;
        return this._p[z];
    }


    getCopyright(cb: (copyrightInfo: any) => void) {
        this.getProvider(this.max).getCopyright(cb);
    }
}
