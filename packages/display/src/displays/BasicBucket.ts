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

import BasicTile from './BasicTile';

import {LRU} from '@here/xyz-maps-common';


abstract class BasicBucket {
    public tiles: LRU<BasicTile>;

    constructor(size: number) {
        this.tiles = new LRU(size);
    }

    abstract create(quadkey: string, layers: any[]): BasicTile

    setMaxSize(size: number) {
        this.tiles.setSize(size);
    }

    getMaxSize() {
        return this.tiles.max;
    }

    get(quadkey: string, skipTrack?: boolean) {
        if (skipTrack) {
            const item = this.tiles._[quadkey];
            return item && item.data;
        }

        return this.tiles.get(quadkey);
    };

    forEach(fnc: (dTile: BasicTile) => void) {
        return this.tiles.forEach(fnc);
    };
}

export default BasicBucket;
