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

import {Attribute} from '../Attribute';
import {FlexArray} from './FlexArray';
import {GeometryBuffer, Uniform} from '../GeometryBuffer';
import {Raycaster} from '../../Raycaster';
import {FRONT} from '../glType';
import {Texture} from '../../Texture';

export type FlexAttribute = {
    data: FlexArray;
    size: number;
    normalized?: boolean;
    stride?: number;
    offset?: number;
    instanced?: boolean;
}
export type ConstantAttribute = {
    value: number[];
}

export type BufferGroup = {
    attributes: { [name: string]: Attribute; }
};

type Index = number[] | Uint16Array | Uint32Array;

export class TemplateBuffer {
    scissor: boolean;

    first: number;
    last: number;

    flexAttributes: { [name: string]: FlexAttribute | ConstantAttribute };
    groups: BufferGroup[];

    i32: boolean = false;

    protected _index?: Index;

    protected _flat: boolean = true;

    idOffsets?: (string | number)[];
    cullFace: number | null;

    instances: number = 0;

    uniforms: { [name: string]: Uniform } = {};

    constructor(flat: boolean, scissor: boolean = false) {
        this._flat = flat;
        this.scissor = scissor;
        // this.flexAttributes = {};

        if (!flat) {
            this.idOffsets = [];
        }

        this.cullFace = FRONT;
        this.first = 0;
    }

    addUniform(name: string, uniform: Uniform) {
        this.uniforms[name] = uniform;
    }

    count(): number {
        let aPosition = this.flexAttributes.a_position as FlexAttribute;

        // if (!aPosition) {
        //     // take length of first group
        //     aPosition = this.groups[0].attributes.a_position;
        // }

        return aPosition.data.length / aPosition.size - this.first;
    }

    setIndex(index: Index) {
        this._index = index;
    }

    index(): Index {
        return this._index = this._index || [];
    }

    hasIndex(): boolean {
        return !!this._index;
    }

    isEmpty(): boolean {
        return this.count() == 0;
    }

    trimAttribute(flexAttr: FlexAttribute): Attribute {
        const attr = <any>flexAttr;
        if (attr.data instanceof FlexArray) {
            attr.data = attr.data.trim();
        }
        return attr;
    }

    isFlat() {
        return this._flat;
    }

    finalize(type: string): GeometryBuffer | null {
        const buffer = this;
        const {flexAttributes} = buffer;
        let geoBuffer: GeometryBuffer;

        if (buffer.hasIndex()) {
            const index = buffer.index();
            if (!index.length) {
                return null;
            }
            geoBuffer = new GeometryBuffer(index, type, buffer.i32);
        } else {
            geoBuffer = new GeometryBuffer({
                first: buffer.first,
                count: buffer.count()
            }, type);
        }

        for (let name in flexAttributes) {
            let attr = flexAttributes[name] as FlexAttribute;
            if (attr.data?.length) {
                geoBuffer.addAttribute(name, buffer.trimAttribute(attr));
            }
        }

        geoBuffer.idOffsets = buffer.idOffsets;
        return geoBuffer;
    }

    setIdOffset(featureId: string | number) {
        this.idOffsets?.push(featureId);
    }

    rayIntersects(buffer: GeometryBuffer, result: { z: number }, tileX: number, tileY: number, rayCaster: Raycaster): number | string {
        return null;
    }
}
