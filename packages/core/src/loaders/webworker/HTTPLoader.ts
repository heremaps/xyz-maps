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

import {HTTPLoader, HTTPLoaderOptions, NetworkError} from '../HTTPLoader';
import Tile from '../../tile/Tile';

// const createWorker = (url) => {
//     const blob   = new Blob(['('+fnc.toString()+')()'], { type: "text/javascript" });
//     const url    = window.URL.createObjectURL(blob);
//     const worker = new Worker(url);
//     worker.objectURL = url;
//     return worker;
// };

type TileResponse = { tile: Tile, success: any, error: any };
type CustomResponse = { resolve: (data: unknown) => void, reject(reason?: any): void };

class WorkerHTTPLoader extends HTTPLoader {
    private worker: Worker;

    private pendingResponses: Map<string, TileResponse | CustomResponse> = new Map();

    constructor(worker: string, options: HTTPLoaderOptions, payload?) {
        super(options);

        payload ||= new ArrayBuffer(0);

        // @ts-ignore
        this.worker = new Worker(window.here.xyz.maps.__workerURL);
        this.worker.postMessage({
            msg: 'init',
            worker,
            options: JSON.parse(JSON.stringify(options)),
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
        const key = data.key || msg;
        const cb = this.pendingResponses.get(key);
        if (cb) {
            this.pendingResponses.delete(key);
            switch (msg) {
            case 'success':
                (cb as TileResponse).success(this.processData(data.data));
                break;
            case 'error':
                const {tile} = cb;
                tile.error = new NetworkError(data.data);
                (cb as TileResponse).error?.(tile.error, tile);
                break;
            default:
                // custom messages
                (cb as CustomResponse).resolve(data.data);
                break;
            }
        }
    }


    load(tile, success, error?) {
        const url = this.getUrl(tile);
        const {quadkey, x, y, z} = tile;
        this.pendingResponses.set(quadkey, {tile, success, error});
        this.worker.postMessage({msg: 'load', url, quadkey, x, y, z});
    }


    abort(tile) {
        const url = this.getUrl(tile);
        const {quadkey, x, y, z} = tile;

        if (this.pendingResponses.get(quadkey)) {
            this.pendingResponses.delete(quadkey);
            this.worker.postMessage({msg: 'abort', url, quadkey, x, y, z});
        }
    }


    private addPendingResponse(key: string) {
        return new Promise(async (resolve, reject) => {
            this.pendingResponses.set(key, {resolve, reject});
        });
    }

    async call(args: { method: string, key?: string, data?: any, transfer?: any[] }): Promise<any> {
        const {method, data, transfer} = args;
        const key = args.method + args.key ?? '';
        const promise = this.addPendingResponse(key);
        this.worker.postMessage({msg: method, key, custom: data}, transfer);
        return promise;
    }
}

export default WorkerHTTPLoader;
