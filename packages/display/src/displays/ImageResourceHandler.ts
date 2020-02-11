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

let _canvas = document.createElement('canvas');
_canvas.width = 1;
_canvas.height = 1;
let _ctx = _canvas.getContext('2d');

function onLoad() {
    let img = this;
    let cbs = img._s;

    // workaround for chrome issue (bug!?) in case of base64 encoded svg image
    // is send to texture with incorrect size.
    _ctx.drawImage(img, 0, 0);


    img.ready = true;
    for (let cbID in cbs) {
        cbs[cbID][0](img, cbs[cbID][1]);
    }
};


declare global {
    interface HTMLImageElement {
        ready: boolean
        _s: { [key: string]: [(...args) => void, any[]] }
    }
}


class ImageResourceHandler {
    private src: { [url: string]: HTMLImageElement } = {};

    constructor() {
    }

    isRequested(url: string) {
        return !!this.src[url];
    };

    isReady(url: string) {
        return this.src[url] && this.src[url].ready;
    };


    get(url: string, cb?: (img: HTMLImageElement, ...args) => void, cbID?: string, args?) {
        let resources = this.src;

        if (resources[url] == UNDEF) {
            let img = resources[url] = new Image();
            img.ready = false;
            img._s = {};

            if (cb) {
                img._s[cbID] = [cb, args];
            }

            img.crossOrigin = 'Anonymous';
            img.onload = onLoad;
            // if (img.decode) {
            //     img.decode().then(() => onLoad(img)).catch((e) => {});
            // }
            img.src = url;
        } else if (cb) {
            // image is still getting loaded..
            if (!resources[url].ready) {
                resources[url]._s[cbID] = [cb, args];
            } else {
                cb(resources[url], args);
            }
        }

        return resources[url];
    };
}


export default ImageResourceHandler;
