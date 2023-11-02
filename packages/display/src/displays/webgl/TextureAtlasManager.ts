/*
 * Copyright (C) 2019-2023 HERE Europe B.V.
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
import {Texture, TextureOptions} from './Texture';

export class TextureAtlasManager {
    private loader = new ImageLoader();
    private atlas: Atlas;
    private textures: Map<string, Texture> = new Map();
    private promises: Map<string, HTMLImageElement | HTMLCanvasElement> = new Map();
    private gl: WebGLRenderingContext;

    constructor(gl: WebGLRenderingContext) {
        this.gl = gl;
        this.atlas = new Atlas({gl, maxImgSize: 64});
    }

    getTexture(src): Texture {
        const texture = this.textures.get(src);
        texture.ref++;
        return texture;
    }

    load(src, textureOptions?: TextureOptions) {
        const {loader, promises} = this;
        return this.textures.get(src) ?? (promises[src] ||= new Promise((resolve, reject) => {
            loader.get(src, (img) => {
                delete promises[src];
                const texture = new Texture(this.gl, img, textureOptions);
                texture.ref = Infinity;
                // texture.onDestroyed = () => {
                //     console.log('deleting texture', src);
                //     this.textures.delete(src);
                // };
                this.textures.set(src, texture);
                resolve(texture);
            }, '*', undefined, true);
        }));
    }

    loadAtlas(src: string, atlasInfo?: { x: number, y: number, width: number, height: number }): ImageInfo | Promise<ImageInfo> {
        const {atlas, loader, promises} = this;
        // let key = atlasInfo ? src+JSON.stringify(atlasInfo) : src;
        if (!atlasInfo) {
            return atlas.get(src) || (promises[src] ||= new Promise((resolve, reject) => {
                loader.get(src, (img) => {
                    delete promises[src];
                    let imageInfo = atlas.set(src, img);
                    this.textures.set(src, atlas.texture);
                    resolve(imageInfo);
                });
            }));
        } else {
            if (this.textures.has(src)) {
                return new ImageInfo(0, atlasInfo.x, atlasInfo.x + atlasInfo.width, atlasInfo.y, atlasInfo.y + atlasInfo.height);
            }
            return this.load(src);
        }
    }

    destroy() {
        this.atlas.destroy();
    }
}
