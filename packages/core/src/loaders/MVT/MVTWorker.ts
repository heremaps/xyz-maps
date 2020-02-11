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

import triangulate from './triangulate';

declare const self: Worker;

const send = (url, success, onError?) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
        if (this.status >= 200 && this.status <= 226) {
            const response = this.response;
            const bytes = response.byteLength;
            success(response, bytes);
        }
    };
    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && (this.status < 200 || this.status >= 300)) {
            this.onload = null;
            if (this.status !== 0 && onError) {
                onError({
                    status: this.status,
                    statusText: this.statusText
                });
            }
        }
    };
    xhr.open('GET', url, true);
    xhr.send(null);
    return xhr;
};


let reqs = new Map();


// let totalEnc = 0;


self.addEventListener('message', function(e) {
    var data = e.data;
    var msg = data.msg;
    const url = data.url;

    switch (msg) {
    case 'abort':
        const xhr = reqs.get(url);
        if (xhr) {
            xhr.abort();
            reqs.delete(url);
        }
        break;

    case 'load':
        reqs.set(url,
            send(url, (arrayBuffer) => {
                // let s = performance.now();
                let triangles = triangulate(arrayBuffer, data.x, data.y, data.z);
                // totalEnc += performance.now()-s;
                // console.log('total encode', totalEnc, 'ms');
                reqs.delete(url);
                self.postMessage({
                    msg: 'success',
                    url: url,
                    data: arrayBuffer,
                    triangles: triangles
                }, [arrayBuffer, triangles]);
            }, (e) => {
                reqs.delete(url);
                self.postMessage({
                    msg: 'error',
                    url: url,
                    data: e
                });
            })
        );
    }
});
