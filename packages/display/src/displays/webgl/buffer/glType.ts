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

type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array;

type TypedArrayConstructor =
    Int8ArrayConstructor
    | Uint8ArrayConstructor
    | Int16ArrayConstructor
    | Uint16ArrayConstructor
    | Int32ArrayConstructor
    | Uint32ArrayConstructor
    | Float32ArrayConstructor;

const glType = (data: TypedArray): number => {
    if (data instanceof Int8Array) return 0x1400; // gl.BYTE;
    if (data instanceof Uint8Array) return 0x1401; // gl.UNSIGNED_BYTE;
    if (data instanceof Int16Array) return 0x1402; // gl.SHORT;
    if (data instanceof Uint16Array) return 0x1403; // gl.UNSIGNED_SHORT;
    if (data instanceof Int32Array) return 0x1404; // gl.INT;
    if (data instanceof Uint32Array) return 0x1405; // gl.UNSIGNED_INT;
    if (data instanceof Float32Array) return 0x1406; // gl.FLOAT;
};

export {glType, TypedArray, TypedArrayConstructor};
