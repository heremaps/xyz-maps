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
import vertexShader from '../glsl/text_vertex.glsl';
// @ts-ignore
import fragmentShader from '../glsl/text_fragment.glsl';

import Program, {ProgramMacros} from './Program';
import {GLStates} from './GLStates';
import {GeometryBuffer} from '../buffer/GeometryBuffer';
import {ViewUniforms} from '../GLRender';
import {BlendFactor, GraphicsDevice} from '../device/GraphicsDevice';

class TextProgram extends Program {
    name = 'Text';

    glStates = new GLStates({
        blend: true,
        scissor: false,
        depth: true
    });

    constructor(device: GraphicsDevice, devicePixelRation: number, macros?: ProgramMacros) {
        super(device, devicePixelRation, macros);

        this.mode = device.gl.TRIANGLES;
        this.vertexShaderSrc = vertexShader;
        this.fragmentShaderSrc = fragmentShader;
    }


    protected blendFunc() {
        this.device.setBlendFunc(BlendFactor.ONE, BlendFactor.ONE_MINUS_SRC_ALPHA);
    }

    // configureRenderState(renderItem: RenderTile, pass: PASS) {
    //     const {gl} = this;
    //     // using LEQUAL and write to depthbuffer used as default in alpha pass will
    //     // lead to lost context on some systems (driverbug?!)
    //     // this issues is also related to overlapping (atlas.spacing) of characters
    //     this.device.setDepthMask(false);
    //     this.device.setDepthMask(true);
    //     gl.depthFunc(gl.LESS);
    //
    //     gl.polygonOffset(0, (1 << 11) * -zIndex);
    //     gl.enable(gl.POLYGON_OFFSET_FILL);
    // }

    draw(geoBuffer: GeometryBuffer) {
        const {gl, uniforms} = this;

        gl.uniform1f(uniforms.u_strokeOnly, 1);
        super.draw(geoBuffer);

        gl.uniform1f(uniforms.u_strokeOnly, 0);
        super.draw(geoBuffer);
    }

    override initViewUniforms(viewUniforms: ViewUniforms, isOffscreenPass = false) {
        super.initViewUniforms(viewUniforms, isOffscreenPass);
        this.initUniform('u_rotate', viewUniforms.rz);
        this.initUniform('u_fixedView', viewUniforms.fixedView);
    }
}

export default TextProgram;
