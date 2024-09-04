/*
 * Copyright (C) 2019-2023 HERE Europe B.V.
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

export class XYZWorker {
    private worker: Worker;
    private fncStr: string;
    private cnt = 0;
    private callbacks: { [id: string]: [(value: unknown) => void, (reason?: any) => void] } = {};

    constructor(workerFunction: Function, methods?: string[]) {
        this.fncStr = workerFunction.toString().match(/^\s*function\s*\(\s*\)\s*\{(([\s\S](?!\}$))*[\s\S])/)[1];
        let worker = this;
        for (let method of methods) {
            this[method] = async (args) => {
                return worker.call(method, args);
            };
        }
    }

    destroy() {
        this.worker?.terminate();
        this.worker = null;
        this.callbacks = null;
    }

    init() {
        if (!this.worker) {
            const workerUrl = URL.createObjectURL(
                new Blob(
                    [
                        this.fncStr,
                        `
self.onmessage = async ({data}) => {try{
        const {message,transfer} = await self[data.method](data.args);
        self.postMessage({result: message, id: data.id}, transfer);
    }catch(error){self.postMessage({error, id: data.id})}
};`
                    ],
                    {type: 'text/javascript'}
                )
            );
            this.worker = new Worker(workerUrl);

            URL.revokeObjectURL(workerUrl);
            delete this.fncStr;

            this.worker.onmessage = ({data}) => {
                const {result, error, id} = data;
                let [resolve, reject] = this.callbacks[id];
                delete this.callbacks[id];
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            };
        }
        return this.worker;
    }

    async call(method: string, args: any) {
        this.init();
        const id = this.cnt++;
        this.worker.postMessage({args, id, method: method});
        return new Promise((resolve, reject) => {
            this.callbacks[id] = [resolve, reject];
        });
    }
}
