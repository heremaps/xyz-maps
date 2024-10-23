/*
 * Copyright (C) 2019-2024 HERE Europe B.V.
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

import TileLoader from './TileLoader';
import {Tile} from '../tile/Tile';

type Callback = (data: any) => void;

class ConcurrentTileLoader implements TileLoader {
    private loaders: { [key: string]: TileLoader };
    private length: number = 0;

    constructor(loaders: { [key: string]: TileLoader }) {
        this.loaders = loaders;
        for (let key in loaders) this.length++;
    };

    abort(tile: Tile): void {
        let {loaders} = this;
        for (let key in loaders) {
            loaders[key].abort(tile);
        }
    }

    load(tile: Tile, success: Callback, error: Callback): void {
        let {loaders, length} = this;
        const data = {};

        for (let key in loaders) {
            const loader = loaders[key];
            loader.load(tile, (d) => {
                data[key] = d;
                if (!--length) {
                    success(data);
                }
            }, (e) => {
                length = -1;
                this.abort(tile);
                error(e);
            });
        }
    }
};

export {ConcurrentTileLoader};
