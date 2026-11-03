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

import type {ModelBuffer} from '../buffer/types/ModelBuffer';
import Program, {PROGRAM_MACRO, ProgramMacros} from './Program';
import {GLStates} from './GLStates';

import {Texture} from '../Texture';
import {GraphicsDevice} from '../device/GraphicsDevice';


class ModelProgram<Buffer extends ModelBuffer = ModelBuffer> extends Program<Buffer> {
    name = 'Model';

    /**
     * Whether the specular highlights are driven by the buffer's own material uniforms.
     * Subclasses sourcing their material from the render state override this.
     */
    protected static usesBufferSpecular(buffer: ModelBuffer): boolean {
        return (buffer.uniforms.illumination as number ?? 2) > 1 &&
            (buffer.uniforms.shininess as number) > 0;
    }

    static getBufferMacroMask(buffer: ModelBuffer) {
        const {uniforms} = buffer;
        let mask = super.getBufferMacroMask(buffer);
        if (buffer.fragmentTileClip) {
            mask |= PROGRAM_MACRO.FRAGMENT_TILE_CLIP;
        }
        if ((uniforms.illumination as number ?? 2) > 0) {
            mask |= PROGRAM_MACRO.DIFFUSE;
        }
        if ((uniforms.normalMap as Texture).width > 1) {
            mask |= PROGRAM_MACRO.NORMAL_MAP;
        }
        if (this.usesBufferSpecular(buffer)) {
            mask |= PROGRAM_MACRO.SPECULAR;
            if (uniforms.shininessMap instanceof Texture) {
                mask |= PROGRAM_MACRO.SHININESS_MAP;
            }
        }
        if (buffer.alphaMode === 'mask') {
            mask |= PROGRAM_MACRO.MODEL_ALPHA_MASK;
        } else if (buffer.alphaMode === 'blend') {
            mask |= PROGRAM_MACRO.MODEL_ALPHA_BLEND;
        }
        if (uniforms.opacityMap) {
            mask |= PROGRAM_MACRO.OPACITY_MAP;
        }
        return mask;
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

    draw(geoBuffer: Buffer, isPreview?: boolean) {
        if (isPreview) {
            this.device.applyPolygonOffsetState(true, 1, 1);
        }
        super.draw(geoBuffer);
    }
}

export default ModelProgram;
