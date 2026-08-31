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

import {LinearGradient} from '@here/xyz-maps-core';
import {FillTexture, LinearGradientStops} from './FillTexture';
import {GraphicsDevice} from './device/GraphicsDevice';
export {LinearGradientStops};

export class GradientFactory {
    static canvas: HTMLCanvasElement = document.createElement('canvas');
    static ctx: CanvasRenderingContext2D = GradientFactory.canvas.getContext('2d');

    constructor(
        private device: GraphicsDevice,
        private width: number = 256,
        private height: number = 1
    ) {
    }

    isGradient(gradient: LinearGradient | any): boolean {
        return typeof gradient?.type == 'string' && typeof gradient.stops == 'object';
    }

    createTexture(linearGradient: LinearGradientStops | LinearGradient, preprocessor?: (stops: LinearGradientStops) => LinearGradientStops): FillTexture {
        const gradientStops: LinearGradientStops = this.isGradient(linearGradient)
            ? (linearGradient as LinearGradient).stops
            : linearGradient as LinearGradientStops;

        const canvas = GradientFactory.canvas;
        const ctx = GradientFactory.ctx;
        const {width, height} = this;
        canvas.width = width;
        canvas.height = height;

        const gradient = ctx.createLinearGradient(0, 0, width, height);

        const stops = preprocessor?.(gradientStops) || gradientStops;

        for (var key in stops) {
            gradient.addColorStop(Number(key), stops[key]);
        }
        // ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        // return paletteCtx.getImageData(0, 0, 256, 1).data;

        const data = ctx.getImageData(0, 0, width, height).data;

        return new FillTexture(this.device, {width, height, data}, {premultiplyAlpha: true});
    }
}

