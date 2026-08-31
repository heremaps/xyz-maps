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

import Program, {PROGRAM_MACRO, ProgramMacros} from './Program';
import {GLStates} from './GLStates';
import {GeometryBuffer} from '../buffer/GeometryBuffer';
import {GraphicsDevice} from '../device/GraphicsDevice';
import {PASS} from '../RenderPass';

class DashedLineProgram extends Program {
    static getMacros(buffer: GeometryBuffer) {
        const {uniforms} = buffer;
        const macros: ProgramMacros = {DASH_ARRAY: PROGRAM_MACRO.DASH_ARRAY};
        if (uniforms.u_dashPattern) {
            macros.DASH_PATTERN = PROGRAM_MACRO.DASH_PATTERN;
        }
        if (uniforms.u_dashTexture) {
            macros.DASH_TEXTURE = PROGRAM_MACRO.DASH_TEXTURE;
        }
        return macros;
    }

    name = 'DashedLine';

    glStates = new GLStates({
        blend: true,
        scissor: true,
        depth: true
    });

    constructor(device: GraphicsDevice, devicePixelRation: number, macros = {}) {
        super(device, devicePixelRation, macros);

        this.mode = device.gl.TRIANGLES;
        this.vertexShaderSrc = vertexShader;
        this.fragmentShaderSrc = fragmentShader;
    }
}

export default DashedLineProgram;
