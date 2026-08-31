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
import {ScreenCopy} from './ScreenCopy';
import type {GraphicsDevice} from './GraphicsDevice';

// Format consumed by the terrain occlusion shader.
export type ScreenDepthFormat = 'depth' | 'rgba';

export class ScreenDepthBackend {
    readonly format: ScreenDepthFormat;
    private readonly device: GraphicsDevice;
    private screenCopy?: ScreenCopy;

    constructor(device: GraphicsDevice) {
        this.device = device;
        this.format = device.isWebGL2 ? 'depth' : 'rgba';
    }

    capture(
        sourceFramebuffer: WebGLFramebuffer,
        destinationFramebuffer: WebGLFramebuffer,
        sourceDepthTexture: WebGLTexture,
        width: number,
        height: number
    ): void {
        (this.screenCopy ||= new ScreenCopy(this.device)).captureDepth(
            sourceFramebuffer,
            destinationFramebuffer,
            sourceDepthTexture,
            width,
            height
        );
    }

    present(
        sourceFramebuffer: WebGLFramebuffer,
        sourceColorTexture: WebGLTexture,
        width: number,
        height: number
    ): void {
        (this.screenCopy ||= new ScreenCopy(this.device)).present(
            sourceFramebuffer,
            sourceColorTexture,
            width,
            height
        );
    }

    destroy(): void {
        this.screenCopy?.destroy();
        this.screenCopy = undefined;
    }
}
