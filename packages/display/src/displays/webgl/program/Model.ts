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
import {Texture} from '../Texture';


class ModelProgram extends Program {
    name = 'Model';

    static getMacros(buffer: GeometryBuffer) {
        const {uniforms} = buffer;
        let macros = super.getMacros(buffer);
        if (uniforms.illumination > 0) {
            macros ||= {};
            macros.DIFFUSE= 1;
        }
        if ((uniforms.normalMap as Texture).width > 1) {
            macros ||= {};
            macros.NORMAL_MAP = 4;
        }
        if (uniforms.shininess > 0) {
            macros ||= {};
            macros.SPECULAR = 2;
        }
        return macros;
    }

    protected static computeMacroMask(macros?: { [name: string]: string | number | boolean }): number {
        return ((macros.DIFFUSE as number) ^ 0) | ((macros.SPECULAR as number) ^ 0) | ((macros.NORMAL_MAP as number) ^ 0);
    }

    static getProgramId(buffer: GeometryBuffer, macros?: { [name: string]: string | number | boolean }) {
        return buffer.type + this.computeMacroMask(macros);
        // return buffer.type + (macros ? (<number>macros.DIFFUSE | <number>macros.SPECULAR | <number>macros.NORMAL_MAP) : '');
        // return buffer.type + (macros ? JSON.stringify(macros) : '');
    }

    glStates = new GLStates({
        scissor: false,
        blend: false,
        depth: true
    });

    constructor(gl: WebGLRenderingContext, devicePixelRation: number, macros?: {
        [name: string]: string | number | boolean
    }) {
        super(gl, devicePixelRation, macros);

        this.vertexShaderSrc = vertexShader;
        this.fragmentShaderSrc = fragmentShader;
    }

    draw(geoBuffer: GeometryBuffer, isPreview?: boolean) {
        const {gl} = this;
        if (isPreview) {
            gl.polygonOffset(1, 1);
            gl.enable(gl.POLYGON_OFFSET_FILL);
        }
        super.draw(geoBuffer);
    }
}

export default ModelProgram;
