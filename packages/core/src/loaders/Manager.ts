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

import {Tile} from '../tile/Tile';

class ManagedLoader {
    private executing = 0;

    private parallel = 16;

    private q = [];
    private lq = {};
    private src: any[];

    constructor(...dataSources) {
        this.src = dataSources;
    }

    exec() {
        const ml = this;
        const queue = ml.q;

        while (queue.length && ml.executing < ml.parallel) {
            ml.fire(queue.pop(), queue.pop(), queue.pop());
        }
    };

    fire(tile: Tile, onSuccess, onError, cacheLoadLevel?: number) {
        const ml = this;

        const dataSources = ml.src;
        const loadingQueue = ml.lq;

        var // tLen           = dataSources.length,
            cacheLoadLevel = cacheLoadLevel ^ 0;

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
            (errorMsg) => {
                onError(errorMsg);
                // cleanup loading queue
                ml.executing--;
                delete loadingQueue[tile.quadkey];

                ml.exec();
            }
        );
    };

    tile(tile: Tile, onSuccess, onError) {
        this.q.push(onError, onSuccess, tile);

        this.exec();
    };

    abort(tile: Tile) {
        const ml = this;
        const queue = ml.q;
        const loadingQueue = ml.lq;
        const dataSources = ml.src;
        let aborted = true;
        let index;
        let request;

        // tile is in queue and waiting for being processed
        if ((index = queue.indexOf(tile)) !== -1) {
            queue.splice(index - 2, 3);
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

    store(tile: Tile, cb) {
        const dataSources = this.src;

        for (const ds in dataSources) {
            if (dataSources[ds].store) {
                dataSources[ds].store(tile, cb);
                break;
            }
        }
    };

    clear() {
        const dataSources = this.src;
        // TODO: need to add support for clearing per tile only in loaders!
        dataSources.forEach((ds) => {
            ds.clear && ds.clear();
        });
    };

    setUrl() {
        const dataSources = this.src;

        for (const ds in dataSources) {
            if (dataSources[ds].setUrl) {
                dataSources[ds].setUrl.apply(dataSources[ds], arguments);
            }
        }
    };
}


const ManagedLoaderPrototype = ManagedLoader.prototype;


export default ManagedLoader;
