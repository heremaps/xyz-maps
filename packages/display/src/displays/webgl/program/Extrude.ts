/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
import vertexShader from '../glsl/extrude_vertex.glsl';
// @ts-ignore
import fragmentShader from '../glsl/extrude_fragment.glsl';

import Program from './Program';
import {GLStates, PASS} from './GLStates';
import {GeometryBuffer} from '../buffer/GeometryBuffer';


class ExtrudeProgram extends Program {
    name = 'Extrude';

    glStates = new GLStates({
        scissor: false,
        blend: false,
        depth: true
    });

    constructor(gl: WebGLRenderingContext, devicePixelRation: number) {
        super(gl, gl.TRIANGLES, vertexShader, fragmentShader, devicePixelRation);
    }

    init(options: GeometryBuffer, pass: PASS, stencil: boolean) {
        const {gl} = this;

        super.init(options, pass, stencil);

        // handle coplanar lines and polygons (stroke of extruded polygons)
        gl.polygonOffset(1, 1);
        gl.enable(gl.POLYGON_OFFSET_FILL);
    }

    draw(geoBuffer: GeometryBuffer) {
        const {gl} = this;

        super.draw(geoBuffer);

        gl.disable(gl.POLYGON_OFFSET_FILL);
    }
}

export default ExtrudeProgram;
