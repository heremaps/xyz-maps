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

import {Attribute} from './Attribute';
import {glType, isTypedArray, TypedArray} from './glType';
import {Texture} from '../Texture';
import {ConstantAttribute, FlexAttribute, TemplateBuffer} from './templates/TemplateBuffer';
import {Raycaster} from '../Raycaster';
import {PASS} from '../program/GLStates';

export type Uniform = number | number[] | Float32Array | Int32Array | boolean | Texture;

export type IndexData = {
    data: Uint16Array | Uint32Array
    type: number;
    length: number;
};

export type ArrayData = {
    first: number;
    count: number;
    mode?: number;
};

export type ArrayGrp = {
    arrays: ArrayData,
    mode?: number,
    uniforms?: { [name: string]: Uniform },
    attributes?: { [name: string]: Attribute }
};
export type IndexGrp = {
    index: IndexData,
    mode?: number,
    uniforms?: { [name: string]: Uniform },
    attributes?: { [name: string]: Attribute }
};

type IndexArray = number[] | Uint32Array | Uint16Array;

const GL_UNSIGNED_SHORT = 0x1403;
const GL_UNSIGNED_INT = 0x1405;

let UNDEF;

const averageFaceNormal = (vertex: TypedArray, i1: number, i2: number, i3: number, normals: TypedArray) => {
    // const t3x = vertex[i1];
    // const t3y = vertex[i1 + 1];
    // const t3z = vertex[i1 + 2];
    //
    // const t2x = vertex[i2];
    // const t2y = vertex[i2 + 1];
    // const t2z = vertex[i2 + 2];
    //
    // const t1x = vertex[i3];
    // const t1y = vertex[i3 + 1];
    // const t1z = vertex[i3 + 2];

    const t1x = vertex[i1];
    const t1y = vertex[i1 + 1];
    const t1z = vertex[i1 + 2];

    const t2x = vertex[i2];
    const t2y = vertex[i2 + 1];
    const t2z = vertex[i2 + 2];

    const t3x = vertex[i3];
    const t3y = vertex[i3 + 1];
    const t3z = vertex[i3 + 2];


    const ux = t2x - t1x;
    const uy = t2y - t1y;
    const uz = t2z - t1z;

    const vx = t3x - t1x;
    const vy = t3y - t1y;
    const vz = t3z - t1z;

    // surface normal
    const nx = uz * vy - uy * vz;
    const ny = ux * vz - uz * vx;
    const nz = uy * vx - ux * vy;

    // sum normals, average
    normals[i1] += nx;
    normals[i1 + 1] += ny;
    normals[i1 + 2] += nz;

    normals[i2] += nx;
    normals[i2 + 1] += ny;
    normals[i2 + 2] += nz;

    normals[i3] += nx;
    normals[i3 + 1] += ny;
    normals[i3 + 2] += nz;
};

class GeometryBuffer {
    static MODE_GL_POINTS: number = 0x0000;
    static MODE_GL_LINES: number = 0x0001;
    static MODE_GL_TRIANGLES: number = 0x0004;
    // private size: number;
    attributes: { [name: string]: Attribute | ConstantAttribute } = {};
    uniforms: { [name: string]: Uniform } = {};
    type: string;
    pass: number = PASS.OPAQUE;
    zIndex?: number;
    zLayer?: number;
    scissor?: boolean;
    depth?: boolean;
    blend?: boolean;
    mode?: number; // primitive to render
    flat: boolean = true;
    groups: (IndexGrp | ArrayGrp)[] = [];
    idOffsets?: (string | number)[];
    pointerEvents?: boolean;
    instances: number = 0;
    // id of the program to render the buffer
    progId: string;

    private _cullFace: number = 0;

    // currently used by "Model" only
    bbox?: number[];
    id?: number | string;
    hitTest?: number;


    static fromTemplateBuffer(type: string, templBuffer: TemplateBuffer): GeometryBuffer {
        const {flexAttributes} = templBuffer;
        let geoBuffer: GeometryBuffer;

        if (templBuffer.hasIndex()) {
            const index = templBuffer.index();

            if (!index.length) {
                return null;
            }
            geoBuffer = new GeometryBuffer(index, type, templBuffer.i32);
        } else {
            geoBuffer = new GeometryBuffer({
                first: templBuffer.first,
                count: templBuffer.count()
            }, type);
        }

        for (let name in flexAttributes) {
            let attr = flexAttributes[name];

            if ((<ConstantAttribute>attr).value) {
                // attribute uses constant value
                geoBuffer.attributes[name] = {value: (<ConstantAttribute>attr).value};
            } else if ((<FlexAttribute>attr).data.length) {
                geoBuffer.addAttribute(name, templBuffer.trimAttribute(attr as FlexAttribute));
            }
        }
        geoBuffer.instances = templBuffer.instances;

        geoBuffer.idOffsets = templBuffer.idOffsets;

        geoBuffer.rayIntersects = templBuffer.rayIntersects;

        geoBuffer.cullFace(templBuffer.cullFace);

        for (let name in templBuffer.uniforms) {
            geoBuffer.addUniform(name, templBuffer.uniforms[name]);
        }

        return geoBuffer;
    }

    constructor(index?: ArrayData | IndexArray, type?: string, i32?: boolean) {
        if (index) {
            this.addGroup(index, i32);
            this.type = type;
        }
    }

    private createIndex(index: number[] | Uint16Array | Uint32Array, i32?: boolean): IndexGrp {
        return {
            index: i32 ? {
                data: isTypedArray(index) ? (<Uint32Array>index) : new Uint32Array(index),
                type: GL_UNSIGNED_INT,
                length: index.length
            } : {
                data: isTypedArray(index) ? (<Uint16Array>index) : new Uint16Array(index),
                type: GL_UNSIGNED_SHORT,
                length: index.length
            }
        };


        // return {
        //     index: i32 ? {
        //         data: new Uint32Array(3),
        //         // data: isTypedArray(index) ? (<Uint16Array | Uint32Array>index) : new Uint32Array(index),
        //         type: GL_UNSIGNED_INT,
        //         length: index.length
        //     } : {
        //         data: isTypedArray(index) ? index : new Uint16Array(index),
        //         type: GL_UNSIGNED_SHORT,
        //         length: index.length
        //     }
        // };
    }

    private createArrays(arrays: ArrayData) {
        // this.arrays = arrays;
        return {arrays};
    }

    addGroup(grp: ArrayData | IndexArray, i32?: boolean, mode?: number): IndexGrp | ArrayGrp {
        if (grp) {
            let group: IndexGrp | ArrayGrp;

            if ((<ArrayData>grp).first != UNDEF) {
                group = this.createArrays(<ArrayData>grp);
            } else {
                group = this.createIndex(<IndexArray>grp, i32);
            }

            if (mode) {
                group.mode = mode;
            }
            return this.groups[this.groups.length] = group;
        }
    }

    addUniform(name: string, uniform: Uniform) {
        this.uniforms[name] = uniform;
    }

    getUniform(name: string): Uniform {
        return this.uniforms[name];
    }

    addAttribute(name: string, attr: Attribute, attributes = this.attributes) {
        const {data} = attr;

        attr.type = glType(data);

        attr.bytesPerElement = data.BYTES_PER_ELEMENT;

        if (attr.stride == UNDEF) {
            attr.stride = 0;
        }

        if (attr.dirty == UNDEF) {
            attr.dirty = true;
        }

        attributes[name] = attr;

        // this.size = data.length;
    }

    computeNormals(
        vertex: TypedArray = (this.attributes.a_position as Attribute)?.data,
        index: TypedArray = (<IndexGrp> this.groups[0]).index?.data
    ) {
        const vertexLength = vertex.length;
        const normals = new Float32Array(vertexLength);

        if (!index) {
            for (let i = 0; i < vertexLength;) {
                averageFaceNormal(vertex, i, i + 3, i += 6, normals);
            }
        } else {
            for (let i = 0, {length} = index; i < length; i += 3) {
                averageFaceNormal(vertex, index[i] * 3, index[i + 1] * 3, index[i + 2] * 3, normals);
            }
        }

        const normalized = new Int8Array(vertexLength);
        for (let i = 0, nx, ny, nz; i < vertexLength; i += 3) {
            nx = normals[i];
            ny = normals[i + 1];
            nz = normals[i + 2];
            let len = nx * nx + ny * ny + nz * nz;
            if (len > 0) {
                len = 1 / Math.sqrt(len);
            }
            len *= 127;
            normalized[i] = Math.round(nx * len);
            normalized[i + 1] = Math.round(ny * len);
            normalized[i + 2] = Math.round(nz * len);
        }
        return normalized;
    }

    getAttributes() {
        return this.attributes;
    }

    destroy(buffer: GeometryBuffer) {

    }

    isPointBuffer() {
        const {type} = this;
        return type != 'Line' && type != 'Extrude';
    }

    isFlat() {
        return this.flat;
    }

    rayIntersects(buffer: GeometryBuffer, result, tileX: number, tileY: number, rayCaster: Raycaster): string | number {
        return null;
    }

    cullFace(cullFace?: number) {
        if (cullFace !== UNDEF) {
            this._cullFace = cullFace;
        }
        return this._cullFace;
    }
}


export {GeometryBuffer};
