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
        texture: Texture;
    };
    private offscreenBuffer: GeometryBuffer;

    constructor(gl: WebGLRenderingContext, devicePixelRation: number) {
        super(gl, devicePixelRation);

        this.mode = gl.TRIANGLES;
        this.vertexShaderSrc = vertexShader;
        this.fragmentShaderSrc = fragmentShader;

        let {width, height} = gl.canvas;
        width /= 4;
        height /= 4;

        const offscreenTexture = new Texture(gl, {width, height, data: null}, {halfFloat: true, premultiplyAlpha: false});

        const offscreenFrameBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, offscreenFrameBuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, offscreenTexture.getGLTexture(), 0);

        this.offscreen = {
            framebuffer: offscreenFrameBuffer,
            texture: offscreenTexture
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

    _pass: PASS;

    private firstTileHandeled: boolean;

    runPass(pass: PASS, buffer: GeometryBuffer): boolean {
        // return super.runPass(pass, buffer);
        switch (pass) {
        case PASS.OPAQUE:
            // By default the offscreenbuffer gets cleared after rendered to screenbuffer immediatly.
            // But if we want to debug the offscreenbuffer we do the following:
            // use opaque pass to only clear the offscreen framebuffer once.
            // So we are ready(clear) to render the current frame.
            // if (this.firstTileHandeled) {
            //     // clear offscreen buffer for next frame
            //     this.clear();
            // }
            return this.firstTileHandeled = false;
        case OFFSCREEN_PASS:
            // Use the PASS.ALPHA to render the tiles to offscreen-framebuffer.
            return true;
        case PASS.POST_ALPHA:
            // use post-alpha pass to render the offscreen to screenbuffer.
            // the first tile of the pass will be used to trigger fullscreen rendering to the offscreen-buffer.
            // further tiles are simply skipped.
            const doPass = this.firstTileHandeled == false;
            this.firstTileHandeled = true;
            return doPass;
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

            const {width, height} = offscreen.texture;
            this.bindFramebuffer(offscreen.framebuffer, width, height);

            const p = this._pass;
            this._pass = PASS.OPAQUE;

            gl.blendFunc(gl.ONE, gl.ONE);

            super.draw(geoBuffer);
            this._pass = p;
        } else {
            // render offscreen-buffer to screen-buffer and colorize the heatmap.
            const {offscreenBuffer} = this;

            this.initBuffers(offscreenBuffer.attributes);
            super.initUniforms(offscreenBuffer.uniforms);
            super.initAttributes(offscreenBuffer.attributes);
            super.initGeometryBuffer(offscreenBuffer, PASS.ALPHA, false);

            super.bindFramebuffer(null);
            // this.gl.colorMask(true, true, true, false);
            // this.gl.colorMask(true, true, true, false);
            // this.gl.colorMask(true, true, true, true);

            // this.gl.disable(this.gl.STENCIL_TEST);

            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            // this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
            super.draw(offscreenBuffer);

            // this.gl.colorMask(true, true, true, false);

            // clear offscreen buffer for next frame
            this.clear();
        }

        this.bindFramebuffer(null);

        gl.disable(gl.BLEND);
        gl.colorMask(true, true, true, false);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    private clear() {
        const {gl, offscreen} = this;
        const {width, height} = offscreen.texture;

        super.bindFramebuffer(offscreen.framebuffer, width, height);

        gl.colorMask(true, true, true, true);
        // gl.disable(gl.STENCIL_TEST);
        gl.disable(gl.SCISSOR_TEST);
        // gl.disable(gl.DEPTH_TEST);
        gl.clearColor(0, 0, 0, 0);
        // gl.clear(gl.COLOR_BUFFER_BIT);
        // gl.depthMask(true);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // gl.colorMask(true, true, true, false);

        super.bindFramebuffer(null);
        // gl.disable(gl.BLEND);
        gl.colorMask(true, true, true, false);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
}

export default HeatmapProgram;
