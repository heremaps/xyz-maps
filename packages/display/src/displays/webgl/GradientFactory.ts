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

import {Texture} from './Texture';

class GradientTexture extends Texture {
    ref: number = 0;
    gradient: any;
    factory: GradientFactory;

    destroy() {
        this.factory.dropTexture(this);
        super.destroy();
    }
}


// let gradientTextCache = new Map();
// window._gradientTextCache = gradientTextCache;
// const defaultGradientConfig = {0: 'rgba(0, 0, 255, 0)', 0.1: 'royalblue', 0.3: 'cyan', 0.5: 'lime', 0.7: 'yellow', 1.0: 'red'};


type LinearGradient = {
    [stop: string]: string;
}

export class GradientFactory {
    static canvas: HTMLCanvasElement = document.createElement('canvas');
    static ctx: CanvasRenderingContext2D = GradientFactory.canvas.getContext('2d');

    private width: number;
    private height: number;
    private gl: WebGLRenderingContext;
    private cache: Map<LinearGradient, GradientTexture> = new Map();

    constructor(gl: WebGLRenderingContext, width: number = 256, height: number = 1) {
        this.gl = gl;
        this.width = width;
        this.height = height;
    }

    getTexture(gradientConfig: LinearGradient): GradientTexture {
        let texture = this.cache.get(gradientConfig);

        if (!texture) {
            const canvas = GradientFactory.canvas;
            const ctx = GradientFactory.ctx;
            const {width, height} = this;
            canvas.width = width;
            canvas.height = height;

            const gradient = ctx.createLinearGradient(0, 0, width, height);
            for (var key in gradientConfig) {
                gradient.addColorStop(Number(key), gradientConfig[key]);
            }
            // ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            // return paletteCtx.getImageData(0, 0, 256, 1).data;

            const data = ctx.getImageData(0, 0, width, height).data;

            texture = new GradientTexture(this.gl, {width, height, data}, {premultiplyAlpha: false});
            texture.gradient = gradientConfig;
            texture.factory = this;

            this.cache.set(gradientConfig, texture);
        }
        texture.ref++;

        return texture;
    }

    dropTexture(texture: GradientTexture) {
        this.cache.delete(texture.gradient);
    }
}


