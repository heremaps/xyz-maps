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

export const std140Types: Record<string, { size: number; align: number }> = {
    // Scalars
    float: {size: 4, align: 4},
    int: {size: 4, align: 4},
    uint: {size: 4, align: 4},
    bool: {size: 4, align: 4},

    // Vectors
    vec2: {size: 8, align: 8},
    ivec2: {size: 8, align: 8},
    uvec2: {size: 8, align: 8},

    vec3: {size: 16, align: 16}, // padded
    ivec3: {size: 16, align: 16},
    uvec3: {size: 16, align: 16},

    vec4: {size: 16, align: 16},
    ivec4: {size: 16, align: 16},
    uvec4: {size: 16, align: 16},

    // Matrices (column-major, column stride = 16)
    mat3: {size: 48, align: 16}, // 3 columns × 16 bytes
    mat4: {size: 64, align: 16} // 4 columns × 16 bytes
};

export interface UniformFieldLayout {
    name: string;
    type: string;
    size: number; // occupies in bytes (std140!)
    offset: number; // offset in bytes within the block
    arraySize?: number; // optional for arrays
}

export interface UniformBlockLayout {
    name: string;
    byteSize: number;
    bindingPoint: number; // Default binding point, can be dynamic if necessary
    fields: UniformFieldLayout[]; // List of uniforms with their types and names
}

const writeStd140 = (buffer: ArrayBuffer, offset: number, type: string, value: any)=> {
    const view = new DataView(buffer);

    switch (type) {
    case 'float':
        view.setFloat32(offset, value, true);
        break;

    case 'bool':
        value = value ? 1 : 0;
    case 'int':
        view.setInt32(offset, value, true);
        break;

    case 'uint':
        view.setUint32(offset, value, true);
        break;

    case 'vec2':
        view.setFloat32(offset + 0, value[0], true);
        view.setFloat32(offset + 4, value[1], true);
        break;

    case 'vec3':
        view.setFloat32(offset + 0, value[0], true);
        view.setFloat32(offset + 4, value[1], true);
        view.setFloat32(offset + 8, value[2], true);
        // remaining 4 bytes already zeroed
        break;

    case 'vec4':
        view.setFloat32(offset + 0, value[0], true);
        view.setFloat32(offset + 4, value[1], true);
        view.setFloat32(offset + 8, value[2], true);
        view.setFloat32(offset + 12, value[3], true);
        break;

    default:
        throw new Error(`Unsupported std140 type: ${type}`);
    }
};

export type UniformBlockFieldSetter = (value: any) => void;

export class UniformBlockInstance {
    layout: UniformBlockLayout;
    glBuffer: WebGLBuffer;
    cpuBuffer: ArrayBuffer;
    dirty = true;
    setters: Record<string, UniformBlockFieldSetter> = {};

    private gl: WebGL2RenderingContext;

    constructor(gl: WebGL2RenderingContext, layout: UniformBlockLayout) {
        this.layout = layout;
        this.cpuBuffer = new ArrayBuffer(layout.byteSize);
        this.glBuffer = gl.createBuffer()!;
        this.gl = gl;

        gl.bindBuffer(gl.UNIFORM_BUFFER, this.glBuffer);
        gl.bufferData(gl.UNIFORM_BUFFER, layout.byteSize, gl.DYNAMIC_DRAW);

        // Auto-Setter per field
        for (const field of layout.fields) {
            this.setters[field.name] = (value: any) => {
                writeStd140(this.cpuBuffer, field.offset, field.type, value);
                this.dirty = true;
            };
        }
    }

    upload() {
        if (this.dirty) {
            const gl = this.gl;
            gl.bindBuffer(gl.UNIFORM_BUFFER, this.glBuffer);
            gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.cpuBuffer);
            console.log('Uploaded UniformBlock:', this.layout.name);
            this.dirty = false;
        }
    }
}
