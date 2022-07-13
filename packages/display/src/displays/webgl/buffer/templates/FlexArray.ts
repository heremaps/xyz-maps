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

import {TypedArray, TypedArrayConstructor} from '../glType';

export interface SimpleArray<T> {
    length: number;
    push(...value: T[]): number;
}

export class FlexArray implements SimpleArray<number> {
    size: number;
    data: TypedArray;
    length: number = 0;

    constructor(TypedArray: TypedArrayConstructor, size: number = 128) {
        this.data = new TypedArray(this.size = size);
    }

    get(index: number): number {
        return this.data[index];
    }

    push(...args);
    push(value: number): number {
        const values = arguments.length;

        this.reserve(values);

        for (let a = 0; a < values; a++) {
            this.data[this.length++] = arguments[a];
        }
        return this.length;
    }

    reserve(size: number) {
        const {data} = this;
        const free = this.size - this.length;
        const needed = size - free;
        if (needed > 0) {
            this.size += Math.max(needed, this.size);
            this.data = new (<any>data).constructor(this.size);
            if (this.length) {
                this.data.set(data);
            }
        }
    }

    trim(): TypedArray {
        // return this.data = this.data.subarray(0,this.length);
        return this.data = this.data.slice(0, this.length);
    }
}
