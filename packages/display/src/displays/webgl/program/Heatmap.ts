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

import Program from './Program';
import {GLStates, PASS} from './GLStates';
import {Texture} from '../Texture';
import {GeometryBuffer} from '../buffer/GeometryBuffer';

const OFFSCREEN_PASS = PASS.ALPHA;

class HeatmapProgram extends Program {
    name = 'Heatmap';

    glStates = new GLStates({
        scissor: false,
        blend: true,
        depth: false
    });

    private offscreen: {
        framebuffer: WebGLFramebuffer;
        depthStencilAttachment: WebGLFramebuffer;
        texture: Texture;
        scale: number
    };
    private offscreenBuffer: GeometryBuffer;

    // Indicates whether the screen buffer for the current frame has already been updated.
    private screenBufferRefreshed: boolean;

    constructor(gl: WebGLRenderingContext, devicePixelRation: number) {
        super(gl, devicePixelRation);

        this.mode = gl.TRIANGLES;
        this.vertexShaderSrc = vertexShader;
        this.fragmentShaderSrc = fragmentShader;

        const offscreenScale = 1;
        // const offscreenScale = 1 / 4;
        let {width, height} = gl.canvas;
        width *= offscreenScale;
        height *= offscreenScale;

        const offscreenTexture = new Texture(gl, {width, height}, {
            halfFloat: true,
            premultiplyAlpha: false
        });
        const offscreenFrameBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, offscreenFrameBuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, offscreenTexture.getGLTexture(), 0);

        const renderBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);

        this.offscreen = {
            framebuffer: offscreenFrameBuffer,
            depthStencilAttachment: renderBuffer,
            texture: offscreenTexture,
            scale: offscreenScale
        };

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

    initPass(pass: PASS, buffer: GeometryBuffer) {
        switch (pass) {
        case PASS.OPAQUE:
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
            const {width, height} = this.offscreen.texture;
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
        const {gl, uniforms, offscreen} = this;

        if (this._pass == OFFSCREEN_PASS) {
            this.initUniforms({u_texture: null});

            // use the offscreen pass to render/blend the data-points into the offscreen-buffer.
            gl.uniform1i(uniforms.u_offscreen, 1);
            gl.enable(gl.BLEND);

            // allow debug offscreenbuffer as "image"
            // gl.colorMask(true, true, true, true);
            gl.colorMask(true, false, false, false);

            // const {width, height} = offscreen.texture;
            // this.bindFramebuffer(offscreen.framebuffer, width, height);
            // // this.bindFramebuffer(null);

            gl.blendFunc(gl.ONE, gl.ONE);

            // gl.depthFunc(gl.LEQUAL);
            // gl.enable(gl.SCISSOR_TEST);


            // gl.depthMask(true);
            // gl.depthFunc(gl.NEVER);
            //* ** ?????? ***
            // gl.enable(gl.DEPTH_TEST);


            super.draw(geoBuffer);

            this.bindFramebuffer(null);
        } else {
            // render offscreen-buffer to screen-buffer and colorize the heatmap.
            const {offscreenBuffer} = this;

            this.initBuffers(offscreenBuffer.attributes);
            this.initUniforms(offscreenBuffer.uniforms);
            this.initAttributes(offscreenBuffer.attributes);
            this.initGeometryBuffer(offscreenBuffer, PASS.ALPHA, false);
            super.draw(offscreenBuffer);
            // clear offscreen buffer for next frame
            this.clear();
        }
    }

    private clear() {
        const {gl, offscreen} = this;
        const {width, height} = offscreen.texture;

        this.bindFramebuffer(offscreen.framebuffer, width, height);

        gl.colorMask(true, true, true, true);
        // gl.disable(gl.STENCIL_TEST);
        gl.disable(gl.SCISSOR_TEST);
        // gl.disable(gl.DEPTH_TEST);
        gl.clearColor(0, 0, 0, 0);
        // gl.clear(gl.COLOR_BUFFER_BIT);
        // gl.depthMask(true);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // gl.colorMask(true, true, true, false);
        this.bindFramebuffer(null);
    }

    setResolution(resolution: readonly number[]) {
        const [screenWidth, screenHeight] = resolution;
        const {gl, offscreen} = this;
        const {scale} = offscreen;
        const {width, height} = offscreen.texture;

        const w = screenWidth * scale;
        const h = screenHeight * scale;

        if (width != w || height != h) {
            offscreen.texture.set({width: w, height: h});

            gl.bindRenderbuffer(gl.RENDERBUFFER, offscreen.depthStencilAttachment);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, w, h);
        }
    }
}

export default HeatmapProgram;
