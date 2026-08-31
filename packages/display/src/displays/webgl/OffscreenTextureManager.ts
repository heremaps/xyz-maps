/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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

import {Pool} from '@here/xyz-maps-common';
import {Texture} from './Texture';
import {GraphicsDevice} from './device/GraphicsDevice';


export class OffscreenTexturePool extends Pool<Texture, [GraphicsDevice, number]> {
    constructor() {
        super(
            (device, size) => {
                // DBG ONLY
                // offscreenOverlayTexture.getGLTexture().id = offscreenOverlayTexture.id = Math.random() * 1e5 ^ 0;
                // const size = this.data.tile.size * 2.0; // * 0.5;
                return new Texture(device, {
                    width: size,
                    height: size
                }, {
                    mipMaps: false
                });
            }, // <--- create()
            (texture) => texture.destroy() // <--- destroy()
        );
    }
}


export class OffscreenTextureManager {
    private pools: { [tileSize: number]: OffscreenTexturePool } = {};

    private _textures: Map<string, Texture> = new Map();

    private getPool(tileSize: number | string): OffscreenTexturePool {
        return this.pools[tileSize] ||= new OffscreenTexturePool();
    }

    get(key: string): Texture | undefined {
        return this._textures.get(key);
    }

    getOrCreate(key: any, tileSize: number, device: GraphicsDevice): Texture {
        let texture = this._textures.get(key);
        if (!texture) {
            texture = this.getPool(tileSize).acquire(device, tileSize);
            this._textures.set(key, texture);
        }
        return texture;
    }

    endFrame() {
        for (const tileSize in this.pools) {
            this.pools[tileSize].releaseAll();
        }
        this._textures.clear();
    }
}
