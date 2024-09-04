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

import Program from './Program';
import {GeometryBuffer} from '../buffer/GeometryBuffer';

class PolygonProgram extends Program {
    name = 'Polygon';

    static getProgramId(buffer: GeometryBuffer, macros?: { [name: string]: string | number | boolean }) {
        const specular = <number>macros?.SPECULAR;
        return specular ? buffer.type + specular : buffer.type;
    }

    static getMacros(buffer: GeometryBuffer) {
        const {uniforms} = buffer;
        let macros;
        if (uniforms.specular) {
            macros = {SPECULAR: 2};
        }
        return macros;
    }

    constructor(gl: WebGLRenderingContext, devicePixelRation: number, macros?: { [name: string]: string | number | boolean }) {
        super(gl, devicePixelRation, macros);

        this.mode = gl.TRIANGLES;
        this.vertexShaderSrc = vertexShader;
        this.fragmentShaderSrc = fragmentShader;
    }

    // initGeometryBuffer(options: GLStates) {
    //     super.initGeometryBuffer(options);
    //     this.gl.depthMask(false);
    // }
}


export default PolygonProgram;
