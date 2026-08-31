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
import {Texture, TextureOptions} from './Texture';
import {ClearMask, GraphicsDevice} from './device/GraphicsDevice';
import type {ScreenDepthFormat} from './device/ScreenDepthBackend';

export interface IRenderTarget {
    readonly width: number;
    readonly height: number;

    bind(device: GraphicsDevice): void;

    clear(device: GraphicsDevice, colorRGBA: number[]): void;

    resize(device: GraphicsDevice, width: number, height: number): void;
}

const DEFAULT_CLEAR_COLOR: number[] = [0, 0, 0, 0];

export type ScreenDepthSnapshotFormat = 'none' | ScreenDepthFormat;

export class ScreenRenderTarget implements IRenderTarget {
    width: number = 0;
    height: number = 0;
    readonly depthSnapshotFormat: ScreenDepthSnapshotFormat;

    private readonly device: GraphicsDevice;
    private clearMask: number;
    private offscreenTarget?: RenderTarget;
    private offscreenColorTexture?: Texture;
    private occlusionDepthTarget?: RenderTarget;
    private occlusionDepthColorTexture?: Texture;
    private depthSnapshotReady = false;

    constructor(device: GraphicsDevice, useDepthTexture: boolean = false) {
        this.device = device;
        const contextAttributes = device.gl.getContextAttributes()||{};
        this.clearMask = ClearMask.COLOR
            | (contextAttributes.depth ? ClearMask.DEPTH : 0)
            | (contextAttributes.stencil ? ClearMask.STENCIL : 0);
        let depthSnapshotFormat: ScreenDepthSnapshotFormat = 'none';
        if (useDepthTexture) {
            const screenDepth = device.getScreenDepth();
            depthSnapshotFormat = screenDepth.format;
        }
        this.depthSnapshotFormat = depthSnapshotFormat;

        if (useDepthTexture) {
            const colorTexture = new Texture(device, {
                width: 1,
                height: 1,
                data: null
            }, {
                mipMaps: false,
                minFilter: device.gl.NEAREST,
                magFilter: device.gl.NEAREST
            });
            this.offscreenColorTexture = colorTexture;
            this.offscreenTarget = new RenderTarget(device, {
                width: 1,
                height: 1,
                colorTexture,
                depthStencilMode: 'depth-stencil',
                depthTexture: true
            });

            if (this.depthSnapshotFormat === 'rgba') {
                this.occlusionDepthColorTexture = new Texture(device, {
                    width: 1,
                    height: 1,
                    data: null
                }, {
                    mipMaps: false,
                    minFilter: device.gl.NEAREST,
                    magFilter: device.gl.NEAREST
                });
                this.occlusionDepthTarget = new RenderTarget(device, {
                    width: 1,
                    height: 1,
                    colorTexture: this.occlusionDepthColorTexture
                });
            } else {
                this.occlusionDepthTarget = new RenderTarget(device, {
                    width: 1,
                    height: 1,
                    depthStencilMode: 'depth-stencil',
                    depthTexture: true
                });
            }
        }
    }


    bind(device: GraphicsDevice) {
        if (this.offscreenTarget) {
            this.offscreenTarget.bind(device);
        } else {
            device.bindFramebuffer(null); // default framebuffer
            device.setViewport(0, 0, this.width, this.height);
        }
    }

    clear(device: GraphicsDevice, clearRGBA: number[] = DEFAULT_CLEAR_COLOR) {
        if (this.offscreenTarget) {
            this.offscreenTarget.clear(device, clearRGBA);
        } else {
            device.setClearColor(clearRGBA[0], clearRGBA[1], clearRGBA[2], clearRGBA[3]);
            device.clear(this.clearMask);
        }
    }

    resize(device: GraphicsDevice, width: number, height: number) {
        if (this.width !== width || this.height !== height) {
            this.width = width;
            this.height = height;
            if (this.offscreenTarget) {
                this.offscreenTarget.resize(device, width, height);
                // resize() leaves bindFramebuffer(null) — rebind the offscreen target
                this.offscreenTarget.bind(device);
            } else {
                device.setViewport(0, 0, width, height);
            }
        }
    }

    beginFrame(): void {
        this.depthSnapshotReady = false;
    }

    hasDepthTextureTarget(): boolean {
        return !!this.offscreenTarget;
    }

    captureDepth(): void {
        if (!this.offscreenTarget || this.depthSnapshotReady) return;

        // console.time('CAPTURE DEPTH!');
        if (!this.occlusionDepthTarget) {
            throw new Error('Depth snapshot target is not initialized');
        } else if (this.occlusionDepthTarget.width !== this.width || this.occlusionDepthTarget.height !== this.height) {
            this.occlusionDepthTarget.resize(this.device, this.width, this.height);
        }

        const screenDepth = this.device.getScreenDepth();
        screenDepth.capture(
            this.offscreenTarget.framebuffer,
            this.occlusionDepthTarget.framebuffer,
            this.offscreenTarget.getDepthTexture().getGLTexture(),
            this.width,
            this.height
        );
        this.depthSnapshotReady = true;
        this.offscreenTarget.bind(this.device);
        // console.timeEnd('CAPTURE DEPTH!');
    }

    getDepthTexture(): Texture | undefined {
        if (!this.depthSnapshotReady || !this.occlusionDepthTarget) return undefined;
        return this.depthSnapshotFormat === 'rgba'
            ? this.occlusionDepthTarget.getColorTexture()
            : this.occlusionDepthTarget.getDepthTexture();
    }

    present(device: GraphicsDevice): void {
        if (!this.offscreenTarget) return;
        if (!this.offscreenColorTexture) {
            throw new Error('Screen color texture is not initialized');
        }
        const screenDepth = device.getScreenDepth();
        screenDepth.present(
            this.offscreenTarget.framebuffer,
            this.offscreenColorTexture.getGLTexture(),
            this.width,
            this.height
        );
    }

    destroy(device: GraphicsDevice): void {
        this.offscreenTarget?.destroy(device);
        this.occlusionDepthTarget?.destroy(device);
        this.offscreenColorTexture?.destroy();
        this.occlusionDepthColorTexture?.destroy();
    }
}


export type DepthStencilMode = 'none' | 'depth' | 'stencil' | 'depth-stencil';

export interface FrameBufferOptions {
    width: number;
    height: number;
    depthStencilMode?: DepthStencilMode;
    colorTexture?: Texture;
    depthTexture?: boolean;
    // texOptions?: TextureOptions;
}

export class RenderTarget implements IRenderTarget {
    readonly framebuffer: WebGLFramebuffer;
    private _colorTexture?: Texture;

    private attachmentMode: DepthStencilMode;
    private depthStencilBuffer?: WebGLRenderbuffer;
    private _depthTexture?: Texture;
    private readonly clearMask: number;

    width: number;
    height: number;

    constructor(
        device: GraphicsDevice,
        // gl: WebGLRenderingContext | WebGL2RenderingContext,
        options: FrameBufferOptions
    ) {
        const gl = device.gl;
        this.width = options.width;
        this.height = options.height;
        const attachmentMode = options.depthStencilMode ?? 'none';
        if (options.depthTexture && attachmentMode !== 'depth' && attachmentMode !== 'depth-stencil') {
            throw new Error('A depth texture requires depthStencilMode "depth" or "depth-stencil"');
        }
        this.attachmentMode = attachmentMode;

        this.clearMask = gl.COLOR_BUFFER_BIT
            | (attachmentMode.includes('depth') ? gl.DEPTH_BUFFER_BIT : 0)
            | (attachmentMode.includes('stencil') ? gl.STENCIL_BUFFER_BIT : 0);

        // Framebuffer
        const fb = gl.createFramebuffer();
        if (!fb) throw new Error('Failed to create framebuffer');
        this.framebuffer = fb;

        device.bindFramebuffer(fb);

        if (options.colorTexture) {
            this.attachColorTexture(device, options.colorTexture);
        } else {
            this.configureColorBuffers(device);
        }

        // Depth / DepthStencil
        if (options.depthTexture) {
            this.allocateDepthTexture(device);
        } else if (attachmentMode !== 'none') {
            const rb = gl.createRenderbuffer();
            if (!rb) throw new Error('Failed to create renderbuffer');
            this.depthStencilBuffer = rb;

            this.allocateDepthStencil(device);
        }

        // this.checkStatus(gl);

        device.bindRenderbuffer(null);
        device.bindFramebuffer(null);
    }

    // private unbindColorTextureFromAllUnits(device: GraphicsDevice): void {
    //     const texObj = this._colorTexture?.getGLTexture();
    //     if (!texObj) return;
    //
    //     const gl = device.gl;
    //
    //     const maxUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number;
    //     const prevActive = gl.getParameter(gl.ACTIVE_TEXTURE) as number;
    //
    //     for (let i = 0; i < maxUnits; i++) {
    //         gl.activeTexture(gl.TEXTURE0 + i);
    //
    //         const bound2D = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;
    //         if (bound2D === texObj) gl.bindTexture(gl.TEXTURE_2D, null);
    //
    //         const boundCube = gl.getParameter(gl.TEXTURE_BINDING_CUBE_MAP) as WebGLTexture | null;
    //         if (boundCube === texObj) gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    //     }
    // }
    bind(device: GraphicsDevice) {
        // Prevent: "Feedback loop formed between Framebuffer and active Texture".
        // this.unbindColorTextureFromAllUnits(device);
        device.bindFramebuffer(this.framebuffer);
        device.setViewport(0, 0, this.width, this.height);
    }

    getColorTexture(): Texture {
        if (!this._colorTexture) {
            throw new Error('No color texture attached');
        }
        return this._colorTexture;
    }

    getDepthTexture(): Texture {
        if (!this._depthTexture) {
            throw new Error('No depth texture attached');
        }
        return this._depthTexture;
    }

    private configureColorBuffers(device: GraphicsDevice): void {
        if (!device.isWebGL2) return;

        const gl = device.gl as WebGL2RenderingContext;
        const attachment = this._colorTexture ? gl.COLOR_ATTACHMENT0 : gl.NONE;
        gl.drawBuffers([attachment]);
        gl.readBuffer(attachment);
    }

    attachColorTexture(device: GraphicsDevice, texture: Texture|null): void {
        this._colorTexture = texture;
        device.bindFramebuffer(this.framebuffer);

        const gl = device.gl;
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            texture ? texture.getGLTexture() : null,
            0
        );

        this.configureColorBuffers(device);
    }

    // private attachColor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    //     const texture = this._colorTexture.getGLTexture();
    //     gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    // }

    private allocateDepthStencil(device: GraphicsDevice) {
        const rb = this.depthStencilBuffer;
        if (!rb) return;

        const gl = device.gl;
        const {width, height} = this;

        device.bindRenderbuffer(rb);

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
            gl.renderbufferStorage(gl.RENDERBUFFER, device.DEPTH_STENCIL_INTERNAL_FORMAT, width, height);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, rb);
            break;
        }
    }

    private allocateDepthTexture(device: GraphicsDevice) {
        const gl = device.gl;
        if (!device.supportsScreenDepthTexture) {
            throw new Error('Depth textures are not supported');
        }
        const isDepthStencil = this.attachmentMode === 'depth-stencil';
        const depthTextureParameters = device.getDepthTextureParameters(isDepthStencil);
        const textureOptions: TextureOptions = {
            format: depthTextureParameters.format,
            internalFormat: depthTextureParameters.internalFormat,
            type: depthTextureParameters.type,
            minFilter: gl.NEAREST,
            magFilter: gl.NEAREST,
            mipMaps: false
        };

        if (!this._depthTexture) {
            this._depthTexture = new Texture(device, {
                width: this.width,
                height: this.height,
                data: null
            }, textureOptions);
        } else {
            this._depthTexture.set({
                width: this.width,
                height: this.height,
                data: null
            });
        }

        device.bindFramebuffer(this.framebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            isDepthStencil ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT,
            gl.TEXTURE_2D,
            this._depthTexture.getGLTexture(),
            0
        );
    }

    private checkStatus(gl: WebGLRenderingContext | WebGL2RenderingContext) {
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error(`Framebuffer incomplete: 0x${status.toString(16)}`);
        }
    }

    resize(device: GraphicsDevice, width: number, height: number): void {
        if (this.width === width && this.height === height) return;

        this.width = width;
        this.height = height;

        device.bindFramebuffer(this.framebuffer);

        // Keep color attachment dimensions in sync with the renderbuffer dimensions.
        if (this._colorTexture) {
            this._colorTexture.set({width, height});
            this.attachColorTexture(device, this._colorTexture);
        }


        if (this._depthTexture) {
            this.allocateDepthTexture(device);
        } else {
            this.allocateDepthStencil(device);
        }

        // this.checkStatus(device.gl);

        device.bindRenderbuffer(null);
        device.bindFramebuffer(null);
    }

    clear(device: GraphicsDevice, colorRGBA: number[] = DEFAULT_CLEAR_COLOR): void {
        device.setClearColor(colorRGBA[0], colorRGBA[1], colorRGBA[2], colorRGBA[3]);
        device.clear(this.clearMask);
    }

    destroy(device: GraphicsDevice): void {
        if (this.depthStencilBuffer) {
            device.deleteRenderbuffer(this.depthStencilBuffer);
        }
        this._depthTexture?.destroy();
        device.deleteFramebuffer(this.framebuffer);
        // this.colorTexture.destroy();
    }


    /**
     * Debug: Reads the color attachment of the FBO and displays it as an overlay image on top of the map.
     * @param gl
     *
     * @hidden
     * @internal
     */
    debugFBOColorImage(
        device?: GraphicsDevice
    ) {
        // @ts-ignore
        device ||= window.here.xyz.maps.Map.getInstances()[0]._display.render.device;
        // const gl = window.here.xyz.maps.Map.getInstances()[0]._display.render.gl;
        const gl = device.gl;
        const {width, height} = this;
        const pixels = new Uint8Array(width * height * 4);
        // Read pixels from FBO
        device.bindFramebuffer(this.framebuffer);
        device.gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        device.bindFramebuffer(null);
        // Flip Y into Uint8ClampedArray
        const flipped = new Uint8ClampedArray(width * height * 4);
        const rowSize = width * 4;
        for (let y = 0; y < height; y++) {
            const src = (height - 1 - y) * rowSize;
            flipped.set(pixels.subarray(src, src + rowSize), y * rowSize);
        }

        this.debugImageData(flipped, width, height);
    }

    debugImageData(pixels: Uint8ClampedArray, width: number, height: number) {
        // Draw to a canvas -> data URL
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
        // Create/reuse overlay container
        const id = 'fbo-debug';
        let container = document.getElementById(id) as HTMLDivElement | null;
        if (container) {
            // Remove old content
            while (container.firstChild) container.removeChild(container.firstChild);
        } else {
            container = document.createElement('div');
            container.id = id;
            document.body.appendChild(container);
        }

        Object.assign(container.style, {
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: '2147483647',
            background: 'repeating-linear-gradient(45deg, #bbb 0 12px, #eee 12px 24px)',
            padding: '8px',
            borderRadius: '6px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            pointerEvents: 'auto',
            display: 'block',
            imageRendering: 'pixelated',
            cursor: 'pointer'
        });
        canvas.addEventListener('click', () => container?.remove(), {once: true});
        container.appendChild(canvas);
    }
}
