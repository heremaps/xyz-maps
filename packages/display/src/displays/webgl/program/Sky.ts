/*
 * Copyright (C) 2019-2024 HERE Europe B.V.
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
import vertexShader from '../glsl/sky_vertex.glsl';
// @ts-ignore
import fragmentShader from '../glsl/sky_fragment.glsl';

import Program, {ProgramMacros} from './Program';
import {GeometryBuffer} from '../buffer/GeometryBuffer';
import {PASS} from './GLStates';

class SkyProgram extends Program {
    name = 'Sky';
    constructor(gl: WebGLRenderingContext, devicePixelRation: number, macros?: ProgramMacros) {
        super(gl, devicePixelRation, macros);

        this.mode = gl.TRIANGLES;
        this.vertexShaderSrc = vertexShader;
        this.fragmentShaderSrc = fragmentShader;
    }
}

export const createSkyMatrix = () => {
    return new Float32Array([
        2, 0, 0, 0, // scale x by 2
        0, -1, 0, 0, // flip y
        0, 0, 1, 0,
        -1, 1, 0, 1 // translate x, y  (top left screen)
    ]);
};
export const createSkyBuffer = () => {
    const tileBuffer = new GeometryBuffer({first: 0, count: 6}, 'Sky');
    // 0 ------- 1
    // |      /  |
    // |    /    |
    // |  /      |
    // 3 ------- 2
    tileBuffer.addAttribute('a_position', {
        data: new Int8Array([
            0, 0,
            1, 0,
            0, 1,
            0, 1,
            1, 0,
            1, 1
        ]),
        size: 2
    });
    tileBuffer.id = 'sky';
    tileBuffer.addUniform('u_fill', [0, 0, 0, 1]);
    tileBuffer.addUniform('u_horizon', [0, 0]);
    tileBuffer.clip = false;
    tileBuffer.depth = false;
    tileBuffer.depthMask = false;
    tileBuffer.pass = PASS.OPAQUE | PASS.ALPHA;
    tileBuffer.blend = false;
    return tileBuffer;
};

export {SkyProgram};
