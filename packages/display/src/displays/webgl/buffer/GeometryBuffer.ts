/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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
import {glType, TypedArray, TypedArrayConstructor} from './glType';
import {Texture} from '../Texture';

type Uniform = number | number[];

type Index = {
    data: Uint16Array | Uint32Array
    type: number;
    length: number;
};

type Arrays = {
    first: number;
    count: number;
    mode?: number;
};


const GL_UNSIGNED_SHORT = 0x1403;
const GL_UNSIGNED_INT = 0x1405;

let UNDEF;

class GeometryBuffer {
    // groups: GeometryGroup[] = [];

    private size: number;

    attributes: { [name: string]: Attribute } = {};

    uniforms: { [name: string]: Uniform } = {};

    texture?: Texture;


    type: string;
    arrays?: Arrays;
    index?: Index;

    alpha: boolean;
    zIndex?: number;
    scissor?: boolean;
    depth?: boolean;
    blend?: true;


    constructor(index?: Arrays | number[], type?: string) {
        if (index) {
            if (index instanceof Array) {
                this.setIndex(index);
            } else {
                this.setArrays(index);
            }
            this.type = type;
        }
    }

    setIndex(index: number[]) {
        this.index = index.length > 0xffff
            ? {
                data: new Uint32Array(index),
                type: GL_UNSIGNED_INT,
                length: index.length
            }
            : {
                data: new Uint16Array(index),
                type: GL_UNSIGNED_SHORT,
                length: index.length
            };
    }

    setArrays(arrays: Arrays) {
        this.arrays = arrays;
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
