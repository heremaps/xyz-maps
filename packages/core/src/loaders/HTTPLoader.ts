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

import TileLoader from './TileLoader';
import {JSUtils} from '@here/xyz-maps-common';
import HTTPClient, {XHRRequest} from './http';
import {global} from '@here/xyz-maps-common';

const DEFAULT_ACCEPT_HEADER = {
    // 'Accept': 'application/geo+json'
};

let UNDEF;

const ABCD = 'abcd';

const getX = /{([xX]|(COL))}/;
const getY = /{([yY]|(ROW))}/;
const getZ = /{([zZ]|(LEVEL))}/;
const getQK = /{((qk)|(QK)|(quadkey)|(QUADKEY))}/;

const SD_I_1_4 = /{SUBDOMAIN_INT_1_4}/;
const SD_I = /{SUBDOMAIN_INT}/;
const SD_C = /{SUBDOMAIN_CHAR}/;

class NetworkError extends Error {
    name = 'NetworkError';
    message: string;
    statusCode: number;
    responseText: string;

    constructor(XHR: XMLHttpRequest) {
        super('Service request failed with HTTP status: \'' + XHR['status'] + ' ' + XHR['statusText'] + '\'');
        const error = this;
        const {responseType} = XHR;

        // error['message'] = 'Service request failed with HTTP status: \'' + XHR['status'] + ' ' + XHR['statusText'] + '\'';
        error['statusCode'] = XHR['status'];

        if (responseType == '' || responseType == 'text') {
            error['responseText'] = XHR['responseText'] || null;
        }

        // error['XHR'] = XHR;
    };
}


export interface HTTPRequest {
    url: string;
    type?: 'POST' | 'GET' | string;
    success?: (data: any, size: number) => void;
    data?: any;
    error?: (msg: NetworkError, xhr?: XMLHttpRequest) => void;
    responseType?: string
    id?: string | number;
    headers?: { [header: string]: any };
}


class HTTPLoader implements TileLoader {
    withCredentials = false;
    http: HTTPClient;

    headers = null;
    store = null;
    baseUrl = null;
    q = {}; // queue

    static createImageFromBlob(blob: Blob, cb: (img) => void) {
        const img = new Image();
        img.onload = (e) => {
            global.URL.revokeObjectURL(img.src);
            cb(img);
        };
        img.src = global.URL.createObjectURL(blob);
    }

    constructor(options: { [key: string]: any }) {
        let responseType = options['responseType'] || 'json';

        const url = options['src'] || options['url'];

        const withCredentials = !!options['withCredentials'];

        this.withCredentials = withCredentials;

        this.baseUrl = url;

        this.headers = JSUtils.extend(
            JSUtils.clone(DEFAULT_ACCEPT_HEADER),
            options['headers'] || {}
        );

        if (typeof url == 'function') {
            this.getUrl = (tile) => url(
                tile.z,
                tile.y,
                tile.x,
                tile.quadkey
            );
        }

        this.http = new HTTPClient({
            responseType: responseType,
            withCredentials: withCredentials
        });
    };

    getUrl(tile) {
        const rInt = Math.random() * 4 ^ 0;

        return this.baseUrl
            .replace(SD_I_1_4, rInt + 1)
            .replace(SD_I, rInt)
            .replace(SD_C, ABCD[rInt])
            .replace(getQK, tile.quadkey)
            .replace(getZ, tile.z)
            .replace(getX, tile.x)
            .replace(getY, tile.y);
    };

    setUrl(url: string) {
        this.baseUrl = url;
    };

    load(tile, success, /* onAbort,*/ error) {
        const url = this.getUrl(tile);

        const qk = tile.quadkey;

        const queue = this.q;

        const req: HTTPRequest = {
            id: qk,
            url,
            success,
            error
        };

        let xhr;


        if (tile.type == 'image') {
            // req.responseType    = 'arraybuffer';
            // req.success       = function( arraybuffer )
            // {
            //     var blob = new Blob( [ new Uint8Array( arraybuffer ) ], { type: "image/png" } );


            req.responseType = 'blob';
            req.success = (blob) => {
                // keep in queue until async image creation is done! (otherwise abort breaks)
                queue[qk] = xhr;

                HTTPLoader.createImageFromBlob(blob, (img) => {
                    delete queue[qk];
                    if (!xhr._aborted) {
                        success(img);
                    }
                });
            };
        } else {
            if (tile.type == 'json') {
                req.success = (data, size) => {
                    success(
                        // in case of FeatureCollection simply pass array of features
                        data.type == 'FeatureCollection'
                            ? data.features
                            : data,
                        size
                    );
                };
            }

            (<any>req).headers = this.headers; // DEFAULT_ACCEPT_HEADER;
        }

        xhr = this.send(req);
    };

    abort(tile) {
        const queue = this.q;
        const key = tile.quadkey;

        const req = queue[key];

        if (req) {
            if (tile.type == 'image') {
                req.onload = UNDEF;

                req._aborted = true;
            }

            if (req.abort) {
                req.abort();
            }

            delete queue[key];
        }
    };

    send(request: HTTPRequest) {
        const loader = this;
        const id = request.id || (<any>request).key || Math.random();
        const queue = loader.q;

        const success = request.success;

        const httpRequest = <XHRRequest><unknown>request;

        httpRequest.success = (data, size) => {
            delete queue[id];
            success(data, size);
        };

        const onError = request.error;

        httpRequest.error = (xhr: XMLHttpRequest) => {
            delete queue[id];
            if (onError) {
                onError(new NetworkError(xhr), xhr);
            }
        };


        return queue[id] = this.http.send(httpRequest);
    };
}

export {HTTPLoader, NetworkError};
