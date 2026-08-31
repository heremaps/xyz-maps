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

import Program, {PROGRAM_MACRO, ProgramMacros} from './Program';
import {GLStates} from './GLStates';
import {GeometryBuffer} from '../buffer/GeometryBuffer';
import {Texture} from '../Texture';
import {GraphicsDevice} from '../device/GraphicsDevice';


class ModelProgram extends Program {
    name = 'Model';

    static getMacros(buffer: GeometryBuffer) {
        const {uniforms} = buffer;
        let macros = super.getMacros(buffer);
        if (uniforms.illumination > 0) {
            macros ||= {};
            macros.DIFFUSE = PROGRAM_MACRO.DIFFUSE;
        }
        if ((uniforms.normalMap as Texture).width > 1) {
            macros ||= {};
            macros.NORMAL_MAP = PROGRAM_MACRO.NORMAL_MAP;
        }
        if (uniforms.shininess > 0) {
            macros ||= {};
            macros.SPECULAR = PROGRAM_MACRO.SPECULAR;
        }
        return macros;
    }

    glStates = new GLStates({
        scissor: false,
        blend: false,
        depth: true
    });

    constructor(device: GraphicsDevice, devicePixelRation: number, macros?: ProgramMacros) {
        super(device, devicePixelRation, macros);

        this.vertexShaderSrc = vertexShader;
        this.fragmentShaderSrc = fragmentShader;
    }

    draw(geoBuffer: GeometryBuffer, isPreview?: boolean) {
        if (isPreview) {
            this.device.applyPolygonOffsetState(true, 1, 1);
        }
        super.draw(geoBuffer);
    }
}

export default ModelProgram;
