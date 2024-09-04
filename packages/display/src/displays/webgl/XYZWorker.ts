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
    private workerStr: string;
    private cnt = 0;
    private callbacks: { [id: string]: [(value: unknown) => void, (reason?: any) => void] } = {};

    constructor(workerFunction: Function) {
        const fnStr = workerFunction.toString();
        const bodyStartIndex = fnStr.indexOf('{') + 1;
        const bodyEndIndex = fnStr.lastIndexOf('}');
        const fullBody = fnStr.substring(bodyStartIndex, bodyEndIndex).trim();
        let fncBody = '';
        let returnVal = null;
        let openBraces = 0;
        fullBody.split('').some((char, i) => {
            if (char == '{') openBraces++;
            if (char == '}') openBraces--;
            if (!openBraces && fullBody.slice(i, i + 6) === 'return') {
                returnVal = fullBody.slice(i + 6).trim().replace(/;?\s*$/, '');
                return true;
            }
            fncBody += char;
        });
        this.workerStr = fncBody.trim() + `;self.__main=${returnVal}`;
        // this.workerStr = fncBody.trim() + `;self.__main=async(o)=>(${returnVal})(o);`;
    }
    async main(args) {
        // return this.call('main', args);
        this.init();
        const id = this.cnt++;
        this.worker.postMessage({args, id, method: '__main'});
        return new Promise((resolve, reject) => {
            this.callbacks[id] = [resolve, reject];
        });
    }
    // private initWorkerMethods(methods: string[]) {
    //     let worker = this;
    //     for (let method of methods) {
    //         this[method] = async (args) => {
    //             return worker.call(method, args);
    //         };
    //     }
    // }
    // async call(method: string, args: any) {
    //     this.init();
    //     const id = this.cnt++;
    //     this.worker.postMessage({args, id, method: method});
    //     return new Promise((resolve, reject) => {
    //         this.callbacks[id] = [resolve, reject];
    //     });
    // }
    private init() {
        if (!this.worker) {
            const workerUrl = URL.createObjectURL(new Blob([
                this.workerStr, `
self.onmessage = async ({data}) => {try{
    const {message,transfer} = await self[data.method](data.args);
        self.postMessage({result: message, id: data.id}, transfer);
    }catch(error){self.postMessage({error, id: data.id})}
};`
            ], {type: 'text/javascript'}
            ));
            this.worker = new Worker(workerUrl);

            URL.revokeObjectURL(workerUrl);
            delete this.workerStr;

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
    destroy() {
        this.worker?.terminate();
        this.worker = null;
        this.callbacks = null;
    }
}
