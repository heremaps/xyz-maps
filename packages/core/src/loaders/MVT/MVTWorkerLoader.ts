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

import {HTTPLoader} from '../../loaders/HTTPLoader';
import {XYZBin} from './XYZBin';

// import MVTWorker from './MVTWorker';


// const createWorker = (url) => {
//     const blob   = new Blob(['('+fnc.toString()+')()'], { type: "text/javascript" });
//     const url    = window.URL.createObjectURL(blob);
//     const worker = new Worker(url);
//     worker.objectURL = url;
//     return worker;
// };


class MVTTileLoader extends HTTPLoader {
    private worker;

    private cbs = new Map();

    constructor(options) {
        // const headers = JSUtils.extend({
        //     'Accept': '*/*'
        // }, options['headers'] || {});
        //
        // options = {
        //     url: options['url'],
        //     headers: headers,
        //     responseType: 'arraybuffer'
        // };

        super(options);

        // @ts-ignore
        this.worker = new Worker(window.here.xyz.maps.__workerURL);
        this.worker.addEventListener('message', this.receiveMessage.bind(this));
    }

    receiveMessage(e) {
        const data = e.data;
        const msg = data.msg;

        switch (msg) {
        case 'success':
            const url = data.url;
            const cb = this.cbs.get(url);


            if (cb) {
                this.cbs.delete(url);

                const tile = cb.tile;
                console.time('decode');

                const xyzBin = new XYZBin(data.triangles);
                const layers = xyzBin.getLayers();

                for (let i in layers) {
                    xyzBin.getFeatures(layers[i]);
                }

                // debugger;

                // let buffer = data.triangles;
                // let dv = new DataView(buffer);
                // let byteLength = dv.byteLength;
                // let byteOffset = 0;
                //
                //
                // while (byteOffset < byteLength) {
                //     // readLayer infos
                //     let index = dv.getUint16(byteOffset);
                //     let layerLength = dv.getUint32(byteOffset + 2) * 2;
                //     let layer = {};
                //     byteOffset += 6;
                //     // byteOffset += layerLength;
                //     let layerByteOffsetEnd = byteOffset + layerLength;
                //     // read feature infos in layer
                //     while (byteOffset < layerByteOffsetEnd) {
                //         let fi = dv.getUint16(byteOffset);
                //         let length = dv.getUint32(byteOffset + 2);
                //         byteOffset += 6;
                //         layer[fi] = new Uint16Array(buffer, byteOffset, length);
                //         byteOffset += length * 2;
                //
                //         // byteOffset += 4 + 2 * dv.getUint32(byteOffset);
                //     }
                //
                //     layers[index] = layer;
                // }

                console.timeEnd('decode');

                // cb.success(data.data);

                cb.success({
                    mvt: data.data,
                    xyz: layers
                });
            }
            break;
        }
    }


    load(tile, success, /* onAbort,*/ onError) {
        const url = this.getUrl(tile);
        this.cbs.set(url, {
            tile: tile,
            success: success,
            error: onError
        });

        this.worker.postMessage({
            msg: 'load',
            url: url,
            x: tile.x,
            y: tile.y,
            z: tile.z
        });
    }


    abort(tile) {
        const url = this.getUrl(tile);
        if (this.cbs.get(url)) {
            this.cbs.delete(url);
            this.worker.postMessage({
                msg: 'abort',
                url: url
            });
        }
    }
}

export default MVTTileLoader;
