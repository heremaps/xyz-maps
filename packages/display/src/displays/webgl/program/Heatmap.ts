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

// @ts-ignore
import vertexShader from '../glsl/heatmap_vertex.glsl';
// @ts-ignore
import fragmentShader from '../glsl/heatmap_fragment.glsl';

import {IRenderTarget, RenderTarget} from '../RenderTarget';
import Program, {CompiledUniformMap} from './Program';
import {GLStates} from './GLStates';
import {Texture, TextureOptions} from '../Texture';
import {GeometryBuffer} from '../buffer/GeometryBuffer';
import {RenderTile} from '../RenderTile';
import {BlendFactor, DepthFunc, GraphicsDevice} from '../device/GraphicsDevice';
import {PASS, RenderPass} from '../RenderPass';
import {ProgramContext} from '../GLRender';


const OFFSCREEN_PASS = PASS.ALPHA_DEPTH;

class HeatmapProgram extends Program {
    name = 'Heatmap';

    glStates = new GLStates({
        scissor: false,
        blend: true,
        depth: false
    });

    private offscreen: RenderTarget;
    private offscreenBuffer: RenderTile;

    // Indicates whether the screen buffer for the current frame has already been updated.
    private screenBufferRefreshed: boolean = true;
    private offscreenScale: number;

    private _pendingOffscreenSize: [width: number, height: number] = [null, null];

    constructor(device: GraphicsDevice, devicePixelRation: number) {
        super(device, devicePixelRation);

        const {gl} = device;
        this.mode = gl.TRIANGLES;
        this.vertexShaderSrc = vertexShader;
        this.fragmentShaderSrc = fragmentShader;

        const offscreenScale = 1 / 2;
        let {width, height} = gl.canvas;
        width *= offscreenScale;
        height *= offscreenScale;


        this.offscreenScale = offscreenScale;

        let texOptions: TextureOptions = {
            premultiplyAlpha: false
        };

        if (this.device.isWebGL2) {
            const gl2 = gl as WebGL2RenderingContext;
            texOptions.type = gl2.HALF_FLOAT;
            texOptions.internalFormat = gl2.R16F;
            texOptions.format = gl2.RED;
            this.device.extensions.getExtension('EXT_color_buffer_float');
            this.device.extensions.getExtension('OES_texture_float_linear');
        } else {
            texOptions.type = this.device.extensions.getExtension('OES_texture_half_float')?.HALF_FLOAT_OES;
            this.device.extensions.getExtension('OES_texture_half_float_linear');
        }

        const colorTexture = new Texture(this.device, {width, height}, texOptions);
        const offscreenFBO = new RenderTarget(this.device, {
            width,
            height,
            colorTexture,
            depthStencilMode: 'depth-stencil'
        });

        const offscreenTexture = offscreenFBO.getColorTexture();
        this.offscreen = offscreenFBO;

        const tileBuffer = new GeometryBuffer({first: 0, count: 6}, 'Heatmap');
        tileBuffer.addAttribute('a_position', {
            data: new Int8Array([-1, 1, 1, 1, 1, -1, -1, 1, 1, -1, -1, -1]),
            size: 2,
            stride: 0
        });
        tileBuffer.addUniform('u_texture', offscreenTexture);
        tileBuffer.addUniform('u_offscreen', false);

        tileBuffer.depth = true;
        this.offscreenBuffer = new RenderTile(tileBuffer);

        this.unbindOffscreenTexture();
    }

    private unbindOffscreenTexture(): void {
        // we know that offscreen texture is always bound to TEXTURE0
        this.device.bindTexture2D(0, null);
    }

    isPassRequired(pass: PASS, itemPass: PASS) {
        switch (pass) {
        case OFFSCREEN_PASS:
            if (this.screenBufferRefreshed) {
                // first draw call of offscreen pass is used to update the offscreenbuffer size if needed...
                this.updatePendingOffscreenSize();
                this.screenBufferRefreshed = false;
            }
            // const {width, height} = this.offscreen.colorTexture;
            // this.bindFramebuffer(this.offscreen.framebuffer, width, height);
            // Use the PASS.ALPHA to render the tiles to offscreen-framebuffer.
            return true;
            // return {framebuffer: this.offscreen.framebuffer};
        case PASS.ALPHA_COLOR:
            // this.bindFramebuffer(null);
            // use post-alpha pass to render the offscreen to screenbuffer.
            // the first tile of the pass will be used to trigger fullscreen rendering to the offscreen-buffer.
            // further tiles are simply skipped.
            const doOnce = !this.screenBufferRefreshed;
            this.screenBufferRefreshed = true;
            return doOnce;
        }
    }

    override applyPassOverrides(
        renderPass: RenderPass,
        renderTile: RenderTile,
        tileStencilId: number | null,
        isOffscreenPass: boolean
    ): boolean {
        const {device} = this;
        if (renderPass.type === OFFSCREEN_PASS) {
            device.setStencilTest(false);
            device.setDepthTest(false);
            device.setColorMask(true, false, false, false);
            // allow debug offscreenbuffer as "image"
            // this.device.setColorMask(true, false, false, false); // gl.colorMask(true, false, false, false);
            device.applyBlendState({enabled: true, src: BlendFactor.ONE, dst: BlendFactor.ONE});
        } else {
            device.setStencilTest(true);
            device.setDepthFunc(DepthFunc.LEQUAL);
        }
        return true;
    }


    override preparePass(pass: PASS, renderTile: RenderTile, renderTarget: IRenderTarget) {
        // preparePass(pass: PASS, renderTile: RenderTile, frameBuffer: WebGLFramebuffer | null = null, w?: number, h?: number) {
        switch (pass) {
        case OFFSCREEN_PASS:
            this.unbindOffscreenTexture();
            this.offscreen.bind(this.device);
            // this.bindFramebuffer(this.offscreen.framebuffer, width, height);
            break;
        case PASS.ALPHA_COLOR:
            this.screenTarget.bind(this.device); // this.bindFramebuffer(null);
            break;
        }
    }

    draw(geoBuffer: GeometryBuffer) {
        const {gl, uniforms} = this;

        if (this._pass == OFFSCREEN_PASS) {
            this.initUniforms({
                u_texture: null,
                // use the offscreen pass to render/blend the data-points into the offscreen-buffer.
                u_offscreen: 1
            });

            super.draw(geoBuffer);
            // unbind offscreen framebuffer and use default framebuffer(screen)
            this.screenTarget.bind(this.device);
        } else {
            // render offscreen-buffer to screen-buffer and colorize the heatmap.
            const {offscreenBuffer} = this;
            this.initUniforms(offscreenBuffer.buffer.uniforms as CompiledUniformMap);
            this.configureRenderState(offscreenBuffer, PASS.ALPHA_COLOR);

            super.draw(offscreenBuffer.buffer);
            // clear offscreen buffer for next frame
            this.clear();

            // Ensure we are not sampling from the offscreen texture while rendering into its FBO.
            this.unbindOffscreenTexture();
        }
    }

    private clear() {
        const {device, offscreen} = this;
        // bind offscreen FBO and set viewport
        // this.bindFramebuffer(offscreen.framebuffer, offscreen.width, offscreen.height);
        offscreen.bind(this.device); // this.bindFramebuffer(null);
        // gl.colorMask(true, true, true, true);
        device.setColorMask(true, true, true, true);
        device.setScissorTest(false);

        offscreen.clear(this.device);
        // unbind FBO and set viewport back to canvas size
        this.screenTarget.bind(this.device); // this.bindFramebuffer(null);
    }

    private updatePendingOffscreenSize() {
        // Defer FBO resize: reallocates attachments; avoid resizing while it’s bound for render/sampling.
        const pendingSize = this._pendingOffscreenSize;
        if (pendingSize[0] != null) {
            this.offscreen.resize(this.device, pendingSize[0], pendingSize[1]);
            pendingSize[0] = null;
            pendingSize[1] = null;
        }
    }

    setContext(mapContext: ProgramContext) {
        const resolution = mapContext.resolution;
        const {offscreen} = this;
        const {width, height} = offscreen;

        const w = resolution[0] * this.offscreenScale;
        const h = resolution[1] * this.offscreenScale;

        if (width != w || height != h) {
            this._pendingOffscreenSize[0] = w;
            this._pendingOffscreenSize[1] = h;
        }
    }

    delete() {
        this.offscreen.destroy(this.device);
        super.delete();
    }
}

export default HeatmapProgram;
