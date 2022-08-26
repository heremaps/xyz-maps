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

import {HTTPLoader} from './HTTPLoader';

// const createWorker = (url) => {
//     const blob   = new Blob(['('+fnc.toString()+')()'], { type: "text/javascript" });
//     const url    = window.URL.createObjectURL(blob);
//     const worker = new Worker(url);
//     worker.objectURL = url;
//     return worker;
// };

class WorkerHTTPLoader extends HTTPLoader {
    private worker: Worker;

    private cbs = new Map();

    constructor(worker: string, options, payload?) {
        super(options);

        payload ||= new ArrayBuffer(0);

        // @ts-ignore
        this.worker = new Worker(window.here.xyz.maps.__workerURL);
        this.worker.postMessage({
            msg: 'init',
            worker,
            payload
        }, [payload]);
        this.worker.addEventListener('message', this.receiveMessage.bind(this));
    }

    protected processData(message: any) {
        return message.data;
    }

    private receiveMessage(e) {
        const data = e.data;
        const msg = data.msg;

        switch (msg) {
        case 'success':
            const quadkey = data.quadkey;
            const cb = this.cbs.get(quadkey);

            if (cb) {
                this.cbs.delete(quadkey);
                cb.success(this.processData(data));
            }
            break;
        }
    }


    load(tile, success, error?) {
        const url = this.getUrl(tile);
        const {quadkey, x, y, z} = tile;
        this.cbs.set(quadkey, {
            tile: tile,
            success: success,
            error
        });

        this.worker.postMessage({msg: 'load', url, quadkey, x, y, z});
    }


    abort(tile) {
        const url = this.getUrl(tile);
        const {quadkey, x, y, z} = tile;

        if (this.cbs.get(quadkey)) {
            this.cbs.delete(quadkey);
            this.worker.postMessage({msg: 'abort', url, quadkey, x, y, z});
        }
    }
}

export default WorkerHTTPLoader;
