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
import vertexShader from '../glsl/polygon_vertex.glsl';
// @ts-ignore
import fragmentShader from '../glsl/polygon_fragment.glsl';

import Program, {PROGRAM_MACRO, ProgramMacros} from './Program';
import {GeometryBuffer} from '../buffer/GeometryBuffer';
import {GraphicsDevice} from '../device/GraphicsDevice';

class PolygonProgram extends Program {
    name = 'Polygon';

    static getMacros(buffer: GeometryBuffer) {
        const {uniforms} = buffer;
        let macros;
        if (uniforms.specular) {
            macros = {SPECULAR: PROGRAM_MACRO.SPECULAR};
        }
        return macros;
    }

    constructor(device: GraphicsDevice, devicePixelRation: number, macros?: ProgramMacros) {
        super(device, devicePixelRation, macros);

        this.mode = device.gl.TRIANGLES;
        this.vertexShaderSrc = vertexShader;
        this.fragmentShaderSrc = fragmentShader;
    }

    // initGeometryBuffer(options: GLStates) {
    //     super.initGeometryBuffer(options);
    //     this.gl.depthMask(false);
    // }
}


export default PolygonProgram;
