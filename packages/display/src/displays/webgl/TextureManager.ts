/*
 * Copyright (C) 2019-2025 HERE Europe B.V.
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
import {Texture} from './Texture';
import {GradientFactory, LinearGradientStops} from './GradientFactory';
import {Color, LinearGradient} from '@here/xyz-maps-core';
import {Color as Colors} from '@here/xyz-maps-common';

export class FillTexture extends Texture {
    ref: number = 0;
    id: Color | LinearGradientStops | LinearGradient;
    cache: TextureCache;

    destroy() {
        this.cache.delete(this.id);
        super.destroy();
    }
}

export type TextureCache = Map<Color | LinearGradientStops | LinearGradient, FillTexture>;

type TextureInput = Color | LinearGradientStops | LinearGradient;

export class TextureManager {
    private gradients: GradientFactory;
    private gl: WebGLRenderingContext;

    constructor(gl: WebGLRenderingContext) {
        this.gradients = new GradientFactory(gl, 256, 1);
        this.gl = gl;
    }

    private textures: Map<TextureInput, FillTexture> = new Map();

    getFillTexture(color: TextureInput): FillTexture | undefined {
        const {gradients} = this;
        let texture = this.textures.get(color);
        if (!texture) {
            if (gradients.isGradient(color)) {
                texture = gradients.createTexture((<unknown>color as LinearGradient));
            } else {
                const rgba = Colors.toRGB(color as Color, true);
                texture = new FillTexture(this.gl, {data: new Uint8Array(rgba.map((c) => c * 255)), width: 1, height: 1});
            }
            this.addTexture(color, texture);
        }
        texture.ref++;
        return texture;
    }

    getGradientTexture(gradient: LinearGradientStops | LinearGradient, preprocessor: (stops: LinearGradientStops) => LinearGradientStops): FillTexture | undefined {
        let texture = this.textures.get(gradient);
        if (!texture) {
            texture = this.gradients.createTexture(gradient, preprocessor);
            this.addTexture(gradient, texture);
        }
        texture.ref++;
        return texture;
    }

    addTexture(id: TextureInput, texture: FillTexture): void {
        this.textures.set(id, texture);
        texture.id = id;
        texture.cache = this.textures;
    }

    removeTexture(id: string): void {
        const texture = this.textures.get(id);
        if (texture) {
            texture.destroy();
            this.textures.delete(id);
        }
    }

    clear(): void {
        for (const texture of this.textures.values()) {
            texture.destroy();
        }
        this.textures.clear();
    }
};
