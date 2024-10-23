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

import {HTTPLoader, HTTPLoaderOptions} from '../HTTPLoader';

declare const self: Worker;


export class HTTPWorker {
    loader;

    id: string;

    constructor(options: HTTPLoaderOptions) {
        const {responseType} = options;

        const loader = this.loader = new HTTPLoader({responseType});
        const worker = this;

        self.addEventListener('message', function(e) {
            const {msg, quadkey, url, x, y, z} = e.data;
            switch (msg) {
            case 'abort':
                loader.abort({quadkey});
                break;

            case 'load':
                loader.baseUrl = url;
                loader.load({quadkey}, (arrayBuffer) => {
                    const {data, transfer} = worker.process(arrayBuffer, x, y, z);

                    self.postMessage({
                        msg: 'success',
                        url,
                        quadkey,
                        data
                    }, transfer);
                },
                (e) => {
                    self.postMessage({msg: 'error', url, quadkey, data: e});
                });
            }
        });
    }

    process(data: any, x: number, y: number, z: number): { data: any, transfer: any[] } {
        return {data, transfer: [data]};
    }
};
