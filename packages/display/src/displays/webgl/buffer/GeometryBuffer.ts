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

import {Attribute} from './Attribute';
import {glType} from './glType';
import {Texture} from '../Texture';
import {GlyphTexture} from '../GlyphTexture';

type Uniform = number | number[] | Float32Array | Int32Array | boolean;

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
    uniforms?: { [name: string]: Uniform }
};
export type IndexGrp = {
    index: IndexData,
    mode?: number,
    uniforms?: { [name: string]: Uniform }
};

const GL_UNSIGNED_SHORT = 0x1403;
const GL_UNSIGNED_INT = 0x1405;

let UNDEF;

class GeometryBuffer {
    private size: number;

    attributes: { [name: string]: Attribute } = {};

    uniforms: { [name: string]: Uniform } = {};

    texture?: Texture | GlyphTexture;

    type: string;

    alpha: number;
    zIndex?: number;
    zLayer?: number;
    scissor?: boolean;
    depth?: boolean;
    blend?: boolean;

    flat: boolean = true;


    groups: (IndexGrp | ArrayGrp)[];


    constructor(index?: ArrayData | number[], type?: string, i32?: boolean) {
        this.groups = [];

        if (index) {
            this.addGroup(index, i32);
            this.type = type;
        }
    }

    private createIndex(index: number[], i32?: boolean) {
        return {
            index: i32 ? {
                data: new Uint32Array(index),
                type: GL_UNSIGNED_INT,
                length: index.length
            } : {
                data: new Uint16Array(index),
                type: GL_UNSIGNED_SHORT,
                length: index.length
            }
        };
    }

    private createArrays(arrays: ArrayData) {
        // this.arrays = arrays;
        return {arrays};
    }

    addGroup(grp: ArrayData | number[], i32?: boolean, mode?: number): IndexGrp | ArrayGrp {
        if (grp) {
            let group: IndexGrp | ArrayGrp;

            if (Array.isArray(grp)) {
                group = this.createIndex(grp, i32);
            } else {
                group = this.createArrays(grp);
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


    // addGroup(group: GeometryGroup) {
    //     const groups = this.groups;
    //     groups[groups.length] = group;
    // }

    // createGroup(index: number[], type: string): GeometryGroup {
    //     return new GeometryGroup(index, type, this.size > 65536);
    // }

    addAttribute(name: string, attr: Attribute) {
        let data = attr.data;

        // if (attr.type) {
        //     data = attr.data = new (<TypedArrayConstructor><unknown>attr.type)(attr.data);
        // }

        attr.type = glType(data);


        if (attr.stride == UNDEF) {
            attr.stride = 0;
        }

        if (attr.dirty == UNDEF) {
            attr.dirty = true;
        }

        this.attributes[name] = attr;

        this.size = data.length;
    }


    getAttributes() {
        return this.attributes;
    }

    destroy() {

    }
}


export {GeometryBuffer};
