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

import {FrameBuffer} from '../FrameBuffer';
import Program, {CompiledUniformMap} from './Program';
import {GLStates, PASS} from './GLStates';
import {TextureOptions} from '../Texture';
import {GeometryBuffer} from '../buffer/GeometryBuffer';

const OFFSCREEN_PASS = PASS.ALPHA;

class HeatmapProgram extends Program {
    name = 'Heatmap';

    glStates = new GLStates({
        scissor: false,
        blend: true,
        depth: false
    });

    private offscreen: FrameBuffer;
    private offscreenBuffer: GeometryBuffer;

    // Indicates whether the screen buffer for the current frame has already been updated.
    private screenBufferRefreshed: boolean;
    private offscreenScale: number;

    private _pendingOffscreenSize: [width: number, height: number] = [null, null];

    constructor(gl: WebGLRenderingContext, devicePixelRation: number) {
        super(gl, devicePixelRation);

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

        if (gl instanceof WebGL2RenderingContext) {
            texOptions.type = gl.HALF_FLOAT;
            texOptions.internalFormat = gl.R16F;
            texOptions.format = gl.RED;
            gl.getExtension('EXT_color_buffer_float');
            gl.getExtension('OES_texture_float_linear');
        } else {
            texOptions.type = gl.getExtension('OES_texture_half_float')?.HALF_FLOAT_OES;
            gl.getExtension('OES_texture_half_float_linear');
        }

        const offscreenFBO = new FrameBuffer(gl, {width, height, depthStencilMode: 'depth-stencil', texOptions});
        const offscreenTexture = offscreenFBO.colorTexture;
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
        this.offscreenBuffer = tileBuffer;
    }

    private unbindOffscreenTexture(): void {
        const {gl} = this;
        // we know that offscreen texture is always bound to TEXTURE0
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    initPass(pass: PASS, buffer: GeometryBuffer) {
        switch (pass) {
        case PASS.OPAQUE:
            // use opaque pass to update offscreenbuffer size if needed.
            this.updatePendingOffscreenSize();
            // By default, the offscreenbuffer gets cleared after rendered to screenbuffer immediately.
            // But if we want to debug the offscreenbuffer we do the following:
            // use opaque pass to only clear the offscreen framebuffer once.
            // So we are ready(clear) to render the current frame.
            // if (this.firstTileHandled) {
            //     // clear offscreen buffer for next frame
            //     this.clear();
            // }
            return this.screenBufferRefreshed = false;
        case OFFSCREEN_PASS:
            const {width, height} = this.offscreen.colorTexture;
            this.bindFramebuffer(this.offscreen.framebuffer, width, height);
            // Use the PASS.ALPHA to render the tiles to offscreen-framebuffer.
            return true;
            // return {framebuffer: this.offscreen.framebuffer};
        case PASS.POST_ALPHA:
            this.bindFramebuffer(null);
            // use post-alpha pass to render the offscreen to screenbuffer.
            // the first tile of the pass will be used to trigger fullscreen rendering to the offscreen-buffer.
            // further tiles are simply skipped.
            const doOnce = !this.screenBufferRefreshed;
            this.screenBufferRefreshed = true;
            return doOnce;
        }
    }

    draw(geoBuffer: GeometryBuffer) {
        const {gl, uniforms} = this;

        if (this._pass == OFFSCREEN_PASS) {
            this.initUniforms({u_texture: null});
            // use the offscreen pass to render/blend the data-points into the offscreen-buffer.
            gl.uniform1i(uniforms.u_offscreen, 1);
            gl.enable(gl.BLEND);
            // allow debug offscreenbuffer as "image"
            // gl.colorMask(true, true, true, true);
            gl.colorMask(true, false, false, false);

            gl.blendFunc(gl.ONE, gl.ONE);
            // gl.depthFunc(gl.LEQUAL);
            // gl.enable(gl.SCISSOR_TEST);
            // gl.depthMask(true);
            // gl.depthFunc(gl.NEVER);
            //* ** ?????? ***
            // gl.enable(gl.DEPTH_TEST);
            super.draw(geoBuffer);
            // unbind offscreen framebuffer and use default framebuffer(screen)
            this.bindFramebuffer(null);
        } else {
            // render offscreen-buffer to screen-buffer and colorize the heatmap.
            const {offscreenBuffer} = this;
            this.initUniforms(offscreenBuffer.uniforms as CompiledUniformMap);
            this.configureRenderState(offscreenBuffer, PASS.ALPHA);
            gl.depthFunc(gl.LEQUAL);

            super.draw(offscreenBuffer);
            // clear offscreen buffer for next frame
            this.clear();

            // Ensure we are not sampling from the offscreen texture while rendering into its FBO.
            this.unbindOffscreenTexture();
        }
    }

    private clear() {
        const {gl, offscreen} = this;
        // bind offscreen FBO and set viewport
        this.bindFramebuffer(offscreen.framebuffer, offscreen.width, offscreen.height);

        gl.colorMask(true, true, true, true);
        gl.disable(gl.SCISSOR_TEST);

        offscreen.clear(gl, 0, 0, 0, 0);
        // unbind FBO and set viewport back to canvas size
        this.bindFramebuffer(null);
    }

    private updatePendingOffscreenSize() {
        // Defer FBO resize: reallocates attachments; avoid resizing while it’s bound for render/sampling.
        const pendingSize = this._pendingOffscreenSize;
        if (pendingSize[0] != null) {
            this.offscreen.resize(this.gl, pendingSize[0], pendingSize[1]);
            pendingSize[0] = null;
            pendingSize[1] = null;
        }
    }

    setResolution(resolution: readonly number[]) {
        const [screenWidth, screenHeight] = resolution;
        const {offscreen} = this;
        const {width, height} = offscreen;

        const w = screenWidth * this.offscreenScale;
        const h = screenHeight * this.offscreenScale;

        if (width != w || height != h) {
            this._pendingOffscreenSize[0] = w;
            this._pendingOffscreenSize[1] = h;
        }
    }

    delete() {
        this.offscreen.destroy(this.gl);
        super.delete();
    }
}

export default HeatmapProgram;
