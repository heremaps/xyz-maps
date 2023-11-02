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

import {ImageLoader} from '../ImageLoader';
import {Atlas, ImageInfo} from './Atlas';
import {Texture} from './Texture';

class IconAtlas {
    private loader = new ImageLoader();
    private atlas: Atlas;
    private textures: Map<string, Texture> = new Map();
    private promises = {};
    private gl: WebGLRenderingContext;

    constructor(gl: WebGLRenderingContext) {
        this.gl = gl;
        this.atlas = new Atlas({gl, maxImgSize: 64});
    }

    getTexture(src): Texture {
        return this.textures.get(src);
    }

    load(src: string, imageInfo?): ImageInfo | Promise<ImageInfo> {
        const {atlas, loader, promises} = this;

        if (!imageInfo) {
            return atlas.get(src) || (promises[src] ||= new Promise((resolve, reject) => {
                loader.get(src, (img) => {
                    delete promises[src];
                    imageInfo = atlas.set(src, img);
                    this.textures.set(src, atlas.texture);
                    resolve(imageInfo);
                });
            }));
        } else {
            return (promises[src] ||= new Promise((resolve, reject) => {
                loader.get(src, (img) => {
                    delete promises[src];
                    this.textures.set(src, new Texture(this.gl, img));
                    resolve(imageInfo);
                });
            }));
        }
    }

    destroy() {
        this.atlas.destroy();
    }
}

export {IconAtlas};
