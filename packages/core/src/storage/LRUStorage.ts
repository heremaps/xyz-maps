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

class LRUStorage implements TileStorage {
    private cache: LRU<Tile>;
    private _onDrop: tileHandler;

    constructor(size: number) {
        this.cache = new LRU(size || 256);
    };

    forEach(fnc: tileHandler) {
        this.cache.forEach(fnc);
    };

    clear() {
        this.cache.clear();
    };

    remove(tile) {
        this.cache.remove(tile.quadkey);
    };

    get(qk: string) {
        return this.cache.get(qk);
    };

    set(tile) {
        const removed = this.cache.set(tile.quadkey, tile);
        const onRemove = this._onDrop;

        if (removed && onRemove) {
            onRemove(removed);
        }
    };

    onDrop(onDrop: tileHandler) {
        this._onDrop = onDrop;
    };
}


export default LRUStorage;
