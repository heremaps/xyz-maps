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
import {isWebGL2} from './glTools';

import {Texture, TextureOptions} from './Texture';

export type DepthStencilMode = 'none' | 'depth' | 'stencil' | 'depth-stencil';

export interface FrameBufferOptions {
    width: number;
    height: number;
    depthStencilMode?: DepthStencilMode;
    texOptions?: TextureOptions;
}

export class FrameBuffer {
    readonly framebuffer: WebGLFramebuffer;
    readonly colorTexture: Texture;

    private attachmentMode: DepthStencilMode;
    private readonly depthStencilBuffer?: WebGLRenderbuffer;
    private readonly clearMask: number;

    width: number;
    height: number;

    constructor(
        gl: WebGLRenderingContext | WebGL2RenderingContext,
        options: FrameBufferOptions
    ) {
        this.width = options.width;
        this.height = options.height;
        const attachmentMode = options.depthStencilMode ?? 'none';
        this.attachmentMode = attachmentMode;

        this.clearMask = gl.COLOR_BUFFER_BIT
            | (attachmentMode.includes('depth') ? gl.DEPTH_BUFFER_BIT : 0)
            | (attachmentMode.includes('stencil') ? gl.STENCIL_BUFFER_BIT : 0);

        //  Color Texture
        this.colorTexture = new Texture(gl, {width: this.width, height: this.height}, options.texOptions);

        // Framebuffer
        const fb = gl.createFramebuffer();
        if (!fb) throw new Error('Failed to create framebuffer');
        this.framebuffer = fb;

        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        this.attachColor(gl);

        // Depth / DepthStencil
        if (attachmentMode !== 'none') {
            const rb = gl.createRenderbuffer();
            if (!rb) throw new Error('Failed to create renderbuffer');
            this.depthStencilBuffer = rb;

            this.allocateDepthStencil(gl);
        }

        this.checkStatus(gl);

        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    private attachColor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
        const texture = this.colorTexture.getGLTexture();
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    }

    private allocateDepthStencil(gl: WebGLRenderingContext | WebGL2RenderingContext) {
        const rb = this.depthStencilBuffer;
        if (!rb) return;

        const {width, height} = this;
        const isGL2 = isWebGL2(gl);

        gl.bindRenderbuffer(gl.RENDERBUFFER, rb);

        switch (this.attachmentMode) {
        case 'depth':
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
            break;
        case 'stencil':
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.STENCIL_INDEX8, width, height);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT, gl.RENDERBUFFER, rb);
            break;
        case 'depth-stencil':
            gl.renderbufferStorage(gl.RENDERBUFFER,
                isGL2 ? (gl as WebGL2RenderingContext).DEPTH24_STENCIL8 : gl.DEPTH_STENCIL,
                width, height
            );
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, rb);
            break;
        }
    }

    private checkStatus(gl: WebGLRenderingContext | WebGL2RenderingContext) {
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error(`Framebuffer incomplete: 0x${status.toString(16)}`);
        }
    }

    resize(gl: WebGLRenderingContext | WebGL2RenderingContext, width: number, height: number): void {
        if (this.width === width && this.height === height) return;

        this.width = width;
        this.height = height;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

        this.colorTexture.set({width, height});
        this.attachColor(gl);

        this.allocateDepthStencil(gl);

        this.checkStatus(gl);

        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    clear(
        gl: WebGLRenderingContext | WebGL2RenderingContext,
        r: number = 0,
        g: number = 0,
        b: number = 0,
        a: number = 0
    ): void {
        gl.clearColor(r, g, b, a);
        gl.clear(this.clearMask);
    }

    destroy(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
        if (this.depthStencilBuffer) {
            gl.deleteRenderbuffer(this.depthStencilBuffer);
        }
        gl.deleteFramebuffer(this.framebuffer);
        this.colorTexture.destroy();
    }
}
