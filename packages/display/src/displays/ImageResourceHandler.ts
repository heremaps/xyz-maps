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
const MAX_IMAGE_SIZE = 64;

let UNDEF;

const _canvas = document.createElement('canvas');
const _ctx = _canvas.getContext('2d');
_canvas.width = 1;
_canvas.height = 1;

const createScaledImage = (img: HTMLImageElement, scale: number): HTMLCanvasElement => {
    const _canvas = document.createElement('canvas');
    const _ctx = _canvas.getContext('2d');
    _canvas.width = img.width * scale;
    _canvas.height = img.height * scale;
    _ctx.drawImage(img, 0, 0, _canvas.width, _canvas.height);
    return _canvas;
};


function onLoad() {
    let img = this;
    const cbs = img._cbs;
    const size = Math.max(img.width, img.height);

    img._cbs = null;

    if (size > MAX_IMAGE_SIZE) {
        // rescale image to fit max allowed source size
        const scale = MAX_IMAGE_SIZE / size;
        img = img._r[img.src] = createScaledImage(img, scale);
    } else {
        // workaround for chrome issue (bug!?) in case of base64 encoded svg image
        // is send to texture with incorrect size.
        _ctx.drawImage(img, 0, 0);
    }
    img.ready = true;
    img._r = null;

    for (let cbID in cbs) {
        cbs[cbID][0](img, cbs[cbID][1]);
    }
}


declare global {
    interface HTMLImageElement {
        ready: boolean
        _cbs: { [key: string]: [(...args) => void, any[]] }
        _r: ImgDataMap
    }
}

type ImgDataMap = { [url: string]: HTMLImageElement };

class ImageResourceHandler {
    private imgData: ImgDataMap = {};

    constructor() {
    }

    isRequested(url: string) {
        return !!this.imgData[url];
    };

    isReady(url: string) {
        return this.imgData[url]?.ready;
    };

    get(url: string, cb?: (img: HTMLImageElement, ...args) => void, cbID?: string, args?) {
        let resources = this.imgData;
        if (resources[url] == UNDEF) {
            let img = resources[url] = new Image();
            img.ready = false;
            img._cbs = {};
            if (cb) {
                img._cbs[cbID] = [cb, args];
            }
            img._r = resources;

            img.crossOrigin = 'Anonymous';
            img.onload = onLoad;
            // if (img.decode) {
            //     img.decode().then(() => onLoad(img)).catch((e) => {});
            // }
            img.src = url;
        } else if (cb) {
            // image is still getting loaded..
            if (!resources[url].ready) {
                resources[url]._cbs[cbID] = [cb, args];
            } else {
                cb(resources[url], args);
            }
        }

        return resources[url];
    };
}


export default ImageResourceHandler;
