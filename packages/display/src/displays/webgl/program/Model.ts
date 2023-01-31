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
import vertexShader from '../glsl/model_vertex.glsl';
// @ts-ignore
import fragmentShader from '../glsl/model_fragment.glsl';

import Program from './Program';
import {GLStates, PASS} from './GLStates';
import {GeometryBuffer} from '../buffer/GeometryBuffer';


class ModelProgram extends Program {
    name = 'Model';

    glStates = new GLStates({
        scissor: false,
        blend: false,
        depth: true
    });

    constructor(gl: WebGLRenderingContext, devicePixelRation: number, macros?) {
        super(gl, gl.TRIANGLES, vertexShader, fragmentShader, devicePixelRation, macros);
    }
}

export default ModelProgram;
