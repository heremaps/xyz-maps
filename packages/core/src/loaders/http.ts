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

let UNDEF;

class HTTPClient {
    withCredentials = false;
    responseType = '';

    constructor(options) {
        for (const o in options) {
            this[o] = options[o];
        }
    }

    send(request) {
        const loader = this;
        const success = request.success;
        const onError = request.error;
        const responseType = request['responseType'] || loader.responseType;
        const headers = request['headers'];
        const xhr = new XMLHttpRequest();
        const withCredentials = request.withCredentials;


        xhr.withCredentials = withCredentials != UNDEF
            ? withCredentials
            : loader.withCredentials;

        // request json as text and do manual JSON.parse() is faster!
        xhr.responseType = responseType == 'json' ? 'text' : responseType;

        xhr.onload = function() {
            const type = this.responseType;

            let response;
            let bytes;

            if (type == '' || type == 'text') {
                response = this.responseText;
                bytes = response.length;

                if (responseType == 'json') {
                    if (this.status != 204) {
                        response = JSON.parse(response);
                    }
                }
            } else {
                response = this.response;
                bytes = response.byteLength;
            }

            if (this.status >= 200 && this.status <= 226) {
                success(response, bytes);
            }
        };

        xhr.onreadystatechange = function() {
            if (
                this.readyState == 4 &&
                // error but not timeout
                (this.status < 200 || this.status >= 300)
            // && status!==0 // ignore aborts
            ) {
                this.onload = null;

                if (this.status !== 0 && onError) {
                    onError(this);
                }
            }
            // else
            //    clearTimeout(xmlHttpTimeout);
        };

        xhr.open(
            request['type'] || 'GET',
            request['url'],
            true
        );

        if (headers) {
            for (const h in headers) {
                xhr.setRequestHeader(h, headers[h]);
            }
        }

        xhr.send(request['data'] || null);

        return xhr;
    }
}


export default HTTPClient;
