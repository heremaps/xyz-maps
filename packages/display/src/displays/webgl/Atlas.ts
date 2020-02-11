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

import {LRU} from '@here/xyz-maps-common';
import {Texture, Image} from './Texture';


class SharedTexture extends Texture {
    // do not destroy texture on tile drop because its shared across multiple tiles.
    destroy(force?: boolean) {
        if (force) {
            super.destroy();
        }
    }
}

interface AtlasOptions {
    gl: WebGLRenderingContext;
    maxImgSize?: number,
}

class ImageInfo {
    i: number;
    u1: number;
    v1: number;
    u2: number;
    v2: number;

    constructor(index: number, u1: number, u2: number, v1: number, v2: number) {
        this.i = index;
        this.u1 = u1;
        this.v1 = v1;
        this.u2 = u2;
        this.v2 = v2;
    }
};

class Atlas {
    private c: LRU<ImageInfo>; // LRU Cache

    private gl: WebGLRenderingContext;

    private max: number; // imagesPerTexture

    private maxSize: number; // maximum Image size

    private d: number; // atlas dimensions

    texture: SharedTexture;

    constructor(options: AtlasOptions) {
        const gl = options.gl;
        const maxImgSize = options.maxImgSize || 256;
        const imagesPerTexture = Math.pow(1024 / maxImgSize, 2);
        const atlasDimension = Math.sqrt(imagesPerTexture);
        // const textureAtlasSizePixel = atlasDimension * maxImgSize;

        this.c = new LRU(imagesPerTexture);
        this.max = imagesPerTexture;
        this.maxSize = maxImgSize;
        this.gl = gl;
        this.d = atlasDimension; // atlasscale = 1/d
        // this.texture = new SharedTexture(gl, {width: textureAtlasSizePixel, height: textureAtlasSizePixel});
    }

    get(key: string): ImageInfo {
        return this.c.get(key);
    };

    init() {
        let {texture, gl, maxSize, d} = this;

        if (!this.texture) {
            const textureAtlasSizePixel = d * maxSize;
            this.texture = new SharedTexture(this.gl, {width: textureAtlasSizePixel, height: textureAtlasSizePixel});
        }
    }

    set(key: string, data: Image): ImageInfo {
        // TODO: remove workaround for image might not been loaded already.
        const cache = this.c;
        const {d, maxSize} = this;
        let atlas = cache.get(key);
        let updateCache = false;
        let index;

        if (!atlas) {
            index = cache.length;
            if (index >= cache.max) {
                atlas = cache.tail.data;
                index = atlas.i;
            }
            updateCache = true;
        } else {
            index = atlas.i;
        }

        // index = index % this.max;
        const ax = index % d ^ 0;
        const ay = index / d ^ 0;
        const u1 = ax * maxSize;
        const v1 = ay * maxSize;
        const u2 = u1 + data.width;
        const v2 = v1 + data.height;

        if (atlas) {
            atlas.u1 = u1;
            atlas.u2 = u2;
            atlas.v1 = v1;
            atlas.v2 = v2;
        } else {
            atlas = new ImageInfo(index, u1, u2, v1, v2);
        }

        if (data instanceof HTMLImageElement || data instanceof HTMLCanvasElement) {
            this.init();
            this.texture.set(data, ax * maxSize, ay * maxSize);
        }

        if (updateCache) {
            cache.set(key, atlas);
        }

        return atlas;
    };

    destroy() {
        const {texture} = this;
        if (texture) {
            texture.destroy(true);
        }
    }
}

export {AtlasOptions, Atlas, ImageInfo, SharedTexture};
