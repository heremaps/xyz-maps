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

import {LRU} from '@here/xyz-maps-common';
import {Tile} from '../tile/Tile';
import {TileStorage, tileHandler} from './TileStorage';

const DEFAULT_CACHE_SIZE_MAIN = 256;
const DEFAULT_CACHE_SIZE_SUB = 1024;

class Tile2LevelStorage implements TileStorage {
    private lvl: number;
    private main: LRU<Tile>;
    private sub: LRU<Tile>;
    private _onDrop: tileHandler;

    constructor(mainLevel: number, main?: LRU<Tile> | number, sub?: LRU<Tile> | number) {
        this.lvl = mainLevel;

        this.main = typeof main == 'object'
            ? main
            : new LRU(main || DEFAULT_CACHE_SIZE_MAIN);


        this.sub = typeof sub == 'object'
            ? sub
            : new LRU(<number>main || DEFAULT_CACHE_SIZE_SUB);
    }

    forEach(th: tileHandler) {
        this.main.forEach(th);
        this.sub.forEach(th);
    };

    clear() {
        this.main.clear();
        this.sub.clear();
    };


    getCache(level: number): LRU<Tile> {
        return level == this.lvl
            ? this.main
            : this.sub;
    };

    remove(tile: Tile) {
        this.getCache(tile.z).remove(tile.quadkey);
    };

    get(qk: string): Tile {
        return this.getCache(qk.length).get(qk);
    };


    set(tile: Tile) {
        const cache = this.getCache(tile.z);
        const removed = cache.set(tile.quadkey, tile);
        const onRemove = this._onDrop;

        if (removed && onRemove) {
            onRemove(removed);
        }
    };

    onDrop(onRemove: tileHandler) {
        this._onDrop = onRemove;
    };
}


export default Tile2LevelStorage;
