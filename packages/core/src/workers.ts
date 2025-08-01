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
import MVTWorker from './loaders/MVT/MVTWorker';
import TerrainWorker from './providers/TerrainProvider/TerrainWorker';


let workers = [MVTWorker, TerrainWorker];

function initListener(e) {
    const {msg, worker, options} = e.data;
    if (msg == 'init') {
        let {Worker} = workers.find((w) => w.id == worker);
        if (Worker) {
            // w.init(payload);
            new Worker(options);
            Worker = null;
        }
        // cleanup
        workers = null;
        self.removeEventListener('message', initListener);
    }
}

self.addEventListener('message', initListener);
