/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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
import {GLExtensions} from './GLExtensions';
import {isWebGL2} from '../glTools';

export type WebGLInstancing = {
    drawElementsInstanced: (
        mode: number,
        count: number,
        type: number,
        offset: number,
        instanceCount: number
    ) => void;
    vertexAttribDivisor: (index: number, divisor: number) => void;
    drawArraysInstanced: (mode: number, first: number, count: number, instanceCount: number) => void;
};

export const createWebGLInstancing = (gl: WebGLRenderingContext | WebGL2RenderingContext, glExtensions: GLExtensions): WebGLInstancing => {
    const isWGL2 = isWebGL2(gl);
    const angleInstancedArrays = 'ANGLE_instanced_arrays';
    // eslint-disable-next-line camelcase
    let ext: ANGLE_instanced_arrays;

    if (!isWGL2) {
        ext = glExtensions.getExtension(angleInstancedArrays);
        if (!ext) {
            console.error(`${angleInstancedArrays} not supported in WebGL1.`);
            return {
                drawElementsInstanced: ()=>{},
                vertexAttribDivisor: ()=>{},
                drawArraysInstanced: ()=>{}
            };
        }
    }

    return {
        drawElementsInstanced: isWGL2
            ? (mode, count, type, offset, instanceCount) =>
                (gl as WebGL2RenderingContext).drawElementsInstanced(mode, count, type, offset, instanceCount)
            : (mode, count, type, offset, instanceCount) =>
                ext!.drawElementsInstancedANGLE(mode, count, type, offset, instanceCount),

        vertexAttribDivisor: isWGL2
            ? (index, divisor) =>
                (gl as WebGL2RenderingContext).vertexAttribDivisor(index, divisor)
            : (index, divisor) =>
                ext!.vertexAttribDivisorANGLE(index, divisor),

        drawArraysInstanced: isWGL2
            ? (mode, first, count, instanceCount) =>
                (gl as WebGL2RenderingContext).drawArraysInstanced(mode, first, count, instanceCount)
            : (mode, first, count, instanceCount) =>
                ext!.drawArraysInstancedANGLE(mode, first, count, instanceCount)
    };
};
