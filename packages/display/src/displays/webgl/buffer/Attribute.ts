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

import {TypedArray, TypedArrayConstructor} from './glType';


// type FlexArray = {
//     type: TypedArrayConstructor,
//     data: Array<number>
// }
export class FlexArray {
    type: TypedArrayConstructor;
    data: Array<number>;

    constructor(type: TypedArrayConstructor) {
        this.data = [];
        this.type = type;
    }
}


type Attribute = {
    data: TypedArray, // | FlexArray,
    stride?: number;
    type?: number|TypedArray;
    size: number;
    normalized?: boolean;
    offset?: number;
};

export {Attribute};
