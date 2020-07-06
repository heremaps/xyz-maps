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

import {MVTProvider} from '../providers/MVTProvider/MVTProvider';
import OSMStyle from '../styles/OSMStyle';
// import MVTTileLoader from '../loaders/MVTTileLoader';
import MVTTileLoader from '../loaders/MVT/MVTWorkerLoader';
import TileStorage from '../storage/Level2Storage';
import {LRU} from '@here/xyz-maps-common';
import {TileLayer} from './TileLayer';
import {Tile} from '../tile/Tile';

let DEFAULT_TILE_SIZE = 512;

export class MVTLayer extends TileLayer {
    getProvider: (number) => MVTProvider;

    constructor(options) {
        // let tileStorage = new TileStorage( level - levelOffset, 16, 16 * 4 );

        const remote = options['remote'];
        const url = remote['url'];
        const remoteMin = remote['min'] || 1;
        const remoteMax = remote['max'] || 16;

        let tileSize = remote['tileSize'];

        const name = options['name'] || '';
        const layerMax = options['max'] || 20;

        const loader = new MVTTileLoader(remote);

        const providers = [];
        let levelOffset;

        if (!tileSize) {
            // check if tilesize is defined in url..
            tileSize = url.match(/256|512|1024|2048|4096/);

            if (tileSize) {
                tileSize = Number(tileSize[0]);
            } else {
                tileSize = DEFAULT_TILE_SIZE;
            }
        }

        // levelOffset = Math.round(Math.log(tileSize) / Math.log(2) - 8);
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
                    // storage : tileStorage
                    // storage : new TileStorage( level - levelOffset, 16, 16 * 4 )
                    storage: new TileStorage(level - levelOffset, cache1, cache2)
                })
            });
        }

        super({
            name: options['name'],
            providers: providers,
            min: options['min'] || remoteMin,
            max: layerMax,
            margin: 0,
            style: options['style'] || OSMStyle,
            tileSize: tileSize
        });
    }


    getCopyright(cb: (copyrightInfo: any) => void) {
        this.getProvider(this.max).getCopyright(cb);
    }
}
