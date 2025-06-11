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

import {Tile} from '../tile/Tile';
import TileLoader from './TileLoader';

type OnTileLoadSuccess = (data: any, size?: number) => void;
type OnTileLoadError = (error: any, data?: any) => void

type QueueItem = {
    tile: Tile;
    onSuccess: OnTileLoadSuccess;
    onError: OnTileLoadError;
}

class ManagedLoader {
    private executing = 0;
    private parallel = 16;

    private q: QueueItem[] = [];
    private lq = {};
    private src: TileLoader[];

    constructor(...dataSources: TileLoader[]) {
        this.src = dataSources;
    }

    private exec() {
        const ml = this;
        const queue = ml.q;

        while (queue.length && ml.executing < ml.parallel) {
            const {onError, onSuccess, tile} = queue.pop();
            ml.loadTile(tile, onSuccess, onError);
            // ml.fire(queue.pop(), queue.pop(), queue.pop());
        }
    };

    private loadTile(tile: Tile, onSuccess: OnTileLoadSuccess, onError: OnTileLoadError, cacheLoadLevel: number = 0) {
        const ml = this;
        const dataSources = ml.src;
        const loadingQueue = ml.lq;

        ml.executing++;
        loadingQueue[tile.quadkey] = [tile, onSuccess, onError, cacheLoadLevel];

        dataSources[cacheLoadLevel].load(tile,

            (data, size) => {
                // cleanup loading queue
                ml.executing--;
                delete loadingQueue[tile.quadkey];
                ml.exec();

                onSuccess(data, size);
            },
            (errorMsg, data) => {
                onError(errorMsg, data);
                // cleanup loading queue
                ml.executing--;
                delete loadingQueue[tile.quadkey];

                ml.exec();
            }
        );
    };

    tile(tile: Tile, onSuccess: OnTileLoadSuccess, onError: OnTileLoadError) {
        this.q.unshift({onError, onSuccess, tile});
        this.exec();
    };

    abort(tile: Tile) {
        const ml = this;
        const queue = ml.q;
        const loadingQueue = ml.lq;
        const dataSources = ml.src;
        let aborted = true;
        let request;

        const itemIndex = queue.findIndex((item) => item.tile === tile);
        // tile is in queue and waiting for being processed
        if (itemIndex !== -1) {
            queue.splice(itemIndex, 1);
        } else if (request = loadingQueue[tile.quadkey]) {
            // tile is already requested and waiting for response
            // cleanup loading queue
            ml.executing--;
            delete loadingQueue[tile.quadkey];

            // abort tile loading request
            dataSources[request[3]].abort(tile);
        } else {
            // nothing aborted...
            aborted = false;
        }

        ml.exec();

        return aborted;
    };

    clear() {
        const dataSources = this.src;
        // TODO: need to add support for clearing per tile only in loaders!
        dataSources.forEach((ds) => {
            ds.clear?.();
        });
    };

    setUrl() {
        for (const dataSource of this.src) {
            dataSource.setUrl?.apply(dataSource, arguments);
        }
    };
}

export default ManagedLoader;
