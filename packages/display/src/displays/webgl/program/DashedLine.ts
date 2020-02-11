/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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
import fragmentShader from '../glsl/line_dash_fragment.glsl';

import Program from './Program';
import {GLStates} from './GLStates';


class DashedLineProgram extends Program {
    name = 'Line';

    glStates = new GLStates({
        blend: true,
        scissor: true,
        depth: true
    })

    pass(pass: string) {
        return pass == 'alpha';
    }

    constructor(gl: WebGLRenderingContext, devicePixelRation: number) {
        super(gl, gl.TRIANGLES, vertexShader, fragmentShader, devicePixelRation);
    }

    init(options: GLStates) {
        const {gl} = this;
        super.init(options);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        // gl.depthFunc(gl.LESS);
    }
}

export default DashedLineProgram;
