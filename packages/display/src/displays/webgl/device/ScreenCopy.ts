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
import {createProgram} from '../glTools';
import type {GraphicsDevice} from './GraphicsDevice';

// @ts-ignore
import vertexShader from '../glsl/screen_copy_vertex.glsl';
// @ts-ignore
import fragmentShader from '../glsl/screen_copy_fragment.glsl';

type CopyProgram = {
    program: WebGLProgram;
    positionLocation: number;
    texcoordLocation: number;
    textureLocation: WebGLUniformLocation;
};

export class ScreenCopy {
    private vertexBuffer: WebGLBuffer | null = null;
    private colorProgram?: CopyProgram;
    private depthProgram?: CopyProgram;

    constructor(private readonly device: GraphicsDevice) {
    }

    captureDepth(
        sourceFramebuffer: WebGLFramebuffer,
        destinationFramebuffer: WebGLFramebuffer,
        sourceDepthTexture: WebGLTexture,
        width: number,
        height: number
    ): void {
        if (this.device.isWebGL2) {
            const gl = this.device.gl as WebGL2RenderingContext;
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, sourceFramebuffer);
            gl.readBuffer(gl.COLOR_ATTACHMENT0);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, destinationFramebuffer);
            gl.blitFramebuffer(
                0, 0, width, height,
                0, 0, width, height,
                gl.DEPTH_BUFFER_BIT,
                gl.NEAREST
            );
            // READ_FRAMEBUFFER/DRAW_FRAMEBUFFER bindings bypass GraphicsDevice's cache.
            // Invalidate it before restoring the main screen target.
            this.device.invalidateFramebufferState();
            return;
        }

        this.drawTexture(sourceDepthTexture, destinationFramebuffer, width, height, true);
    }

    present(
        sourceFramebuffer: WebGLFramebuffer,
        sourceColorTexture: WebGLTexture,
        width: number,
        height: number
    ): void {
        if (this.device.isWebGL2) {
            const gl = this.device.gl as WebGL2RenderingContext;
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, sourceFramebuffer);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
            gl.blitFramebuffer(
                0, 0, width, height,
                0, 0, width, height,
                gl.COLOR_BUFFER_BIT,
                gl.NEAREST
            );
            this.device.invalidateFramebufferState();
            this.device.bindFramebuffer(null);
            this.device.setViewport(0, 0, width, height);
            return;
        }

        this.drawTexture(sourceColorTexture, null, width, height, false);
    }

    destroy(): void {
        const gl = this.device.gl;
        if (this.vertexBuffer) {
            gl.deleteBuffer(this.vertexBuffer);
            this.vertexBuffer = null;
        }
        if (this.colorProgram) {
            gl.deleteProgram(this.colorProgram.program);
            this.colorProgram = undefined;
        }
        if (this.depthProgram) {
            gl.deleteProgram(this.depthProgram.program);
            this.depthProgram = undefined;
        }
    }

    private drawTexture(
        texture: WebGLTexture,
        destinationFramebuffer: WebGLFramebuffer | null,
        width: number,
        height: number,
        packDepth: boolean
    ): void {
        const gl = this.device.gl;
        const copyProgram = packDepth
            ? this.depthProgram ||= this.createProgram(
                this.getPackedDepthFragmentSource()
            )
            : this.colorProgram ||= this.createProgram(fragmentShader);

        this.ensureVertexBuffer();
        this.device.unbindVertexArray();

        this.device.bindFramebuffer(destinationFramebuffer);
        this.device.setViewport(0, 0, width, height);

        this.device.setDepthTest(false);
        this.device.setDepthMask(false);
        this.device.setStencilTest(false);
        this.device.setScissorTest(false);
        this.device.setBlendEnabled(false);
        this.device.setCullFaceEnabled(false);
        this.device.setPolygonOffsetFillEnabled(false);
        this.device.setColorMask(true, true, true, true);

        // Dithering changes packed depth values and must be disabled for this pass.
        gl.disable(gl.DITHER);
        gl.useProgram(copyProgram.program);
        this.device.bindTexture2D(0, texture);
        gl.uniform1i(copyProgram.textureLocation, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(copyProgram.positionLocation);
        gl.vertexAttribPointer(copyProgram.positionLocation, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(copyProgram.texcoordLocation);
        gl.vertexAttribPointer(copyProgram.texcoordLocation, 2, gl.FLOAT, false, 16, 8);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disableVertexAttribArray(copyProgram.positionLocation);
        gl.disableVertexAttribArray(copyProgram.texcoordLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.useProgram(null);

        // Restore a coherent cached device state before the next render pass.
        this.device.resetStateToDefaults({keepViewport: true});
    }

    private ensureVertexBuffer(): void {
        if (this.vertexBuffer) return;

        const gl = this.device.gl;
        const buffer = gl.createBuffer();
        if (!buffer) {
            throw new Error('Failed to create screen copy vertex buffer');
        }

        this.vertexBuffer = buffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                -1, -1, 0, 0,
                1, -1, 1, 0,
                -1, 1, 0, 1,
                1, 1, 1, 1
            ]),
            gl.STATIC_DRAW
        );
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    private createProgram(fragmentShader: string): CopyProgram {
        const gl = this.device.gl;
        const program = createProgram(gl, vertexShader, fragmentShader);
        if (!program) {
            throw new Error('Failed to create screen copy program');
        }

        const positionLocation = gl.getAttribLocation(program, 'a_position');
        const texcoordLocation = gl.getAttribLocation(program, 'a_texcoord');
        const textureLocation = gl.getUniformLocation(program, 'u_texture');
        if (positionLocation < 0 || texcoordLocation < 0 || !textureLocation) {
            gl.deleteProgram(program);
            throw new Error('Screen copy program is missing required bindings');
        }

        return {
            program,
            positionLocation,
            texcoordLocation,
            textureLocation
        };
    }

    private getPackedDepthFragmentSource(): string {
        const gl = this.device.gl;
        const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
        const source = precision && precision.precision > 0
            ? fragmentShader.replace('precision mediump float;', 'precision highp float;')
            : fragmentShader;
        return `#define SCREEN_COPY_PACK_DEPTH 1\n${source}`;
    }
}
