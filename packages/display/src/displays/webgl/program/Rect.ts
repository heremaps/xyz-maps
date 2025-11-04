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
import vertexShader from '../glsl/rect_vertex.glsl';
// @ts-ignore
import fragmentShader from '../glsl/rect_fragment.glsl';

import Program, {ProgramMacros} from './Program';
import {GLStates} from './GLStates';
import {GeometryBuffer} from '../buffer/GeometryBuffer';

class RectProgram extends Program {
    name = 'Rect';

    glStates = new GLStates({
        scissor: false,
        blend: false,
        depth: true
    });


    static getProgramId(buffer: GeometryBuffer, macros?: ProgramMacros) {
        return buffer.type + macros?.USE_HEIGHTMAP||'';
    }

    constructor(gl: WebGLRenderingContext, devicePixelRation: number, macros?: ProgramMacros) {
        super(gl, devicePixelRation, macros);

        this.mode = gl.TRIANGLES;
        this.vertexShaderSrc = vertexShader;
        this.fragmentShaderSrc = fragmentShader;
    }
}

export default RectProgram;
