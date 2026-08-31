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
import vertexShader from '../glsl/icon_vertex.glsl';
// @ts-ignore
import fragmentShader from '../glsl/icon_fragment.glsl';

import Program, {ProgramMacros} from './Program';
import {GLStates} from './GLStates';
import {ViewUniforms} from '../GLRender';
import {GraphicsDevice} from '../device/GraphicsDevice';
import {GeometryBuffer} from '../buffer/GeometryBuffer';

class IconProgram extends Program {
    name = 'Icon';

    glStates = new GLStates({
        blend: true,
        scissor: false,
        // disable depth because of artifacts around icons in case of image is not fully covering texture area..
        depth: true
    });

    constructor(device: GraphicsDevice, devicePixelRation: number, macros?: ProgramMacros) {
        super(device, devicePixelRation, macros);

        this.mode = device.gl.TRIANGLES;
        this.vertexShaderSrc = vertexShader;
        this.fragmentShaderSrc = fragmentShader;
    }

    initViewUniforms(viewUniforms: ViewUniforms, isOffscreenPass = false) {
        super.initViewUniforms(viewUniforms, isOffscreenPass);
        this.initUniform('u_fixedView', viewUniforms.fixedView);
    }
}

export default IconProgram;
