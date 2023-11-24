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
import vertexShader from '../glsl/line_vertex.glsl';
// @ts-ignore
import fragmentShader from '../glsl/line_fragment.glsl';

import Program from './Program';
import {GLStates, PASS} from './GLStates';
import {GeometryBuffer} from '../buffer/GeometryBuffer';

class DashedLineProgram extends Program {
    static getMacros(buffer: GeometryBuffer) {
        const {uniforms} = buffer;
        return {DASHARRAY: 1 | (uniforms.u_dashPattern?2:0) | (uniforms.u_dashTexture?4:0)};
    }

    static getProgramId(buffer: GeometryBuffer, macros?: { [name: string]: string | number | boolean }) {
        return buffer.type + (<number>macros.DASHARRAY);
    }

    name = 'DashedLine';

    glStates = new GLStates({
        blend: true,
        scissor: true,
        depth: true
    });

    constructor(gl: WebGLRenderingContext, devicePixelRation: number, macros = {}) {
        super(gl, devicePixelRation, macros);

        this.mode = gl.TRIANGLES;
        this.vertexShaderSrc = vertexShader;
        this.fragmentShaderSrc = fragmentShader;
    }

    protected blendFunc(sFactor?: number, dFactor?: number) {
        const {gl} = this;
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
}

export default DashedLineProgram;
