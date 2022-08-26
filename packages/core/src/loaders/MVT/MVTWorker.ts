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

import triangulate from './triangulate';
import {HTTPLoader} from '../HTTPLoader';

declare const self: Worker;

let loader;

export const MVTWorker = {
    id: 'MVTWorker',
    init(payload) {
        loader = new HTTPLoader({responseType: 'arraybuffer'});

        self.addEventListener('message', function(e) {
            const {msg, quadkey, url, x, y, z} = e.data;
            switch (msg) {
            case 'abort':
                loader.abort({quadkey});
                break;

            case 'load':
                loader.baseUrl = url;
                loader.load({quadkey},
                    (arrayBuffer) => {
                        const triangles = triangulate(arrayBuffer, x, y, z);

                        self.postMessage({
                            msg: 'success',
                            url,
                            quadkey,
                            data: arrayBuffer,
                            triangles: triangles
                        }, [arrayBuffer, triangles]);
                    },
                    (e) => {
                        self.postMessage({
                            msg: 'error',
                            url,
                            quadkey,
                            data: e
                        });
                    });
            }
        });
    }
};
