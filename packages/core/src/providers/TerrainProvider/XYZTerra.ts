/*
 * Copyright (C) 2019-2025 HERE Europe B.V.
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

type TypedArray =
    Float64Array
    | Float32Array
    | Uint16Array
    | Int16Array
    | Uint8Array
    | Uint32Array
    | Int8Array
    | Int32Array;

const initTypedArray = (data: number): TypedArray => {
    const typeBits = data & 0xF;
    const length = data >> 4;

    switch (typeBits) {
    case 0x0:
        return new Uint8Array(length);
    case 0x1:
        return new Uint16Array(length);
    case 0x2:
        return new Uint32Array(length);
    case 0x3:
        return new Int8Array(length);
    case 0x4:
        return new Int16Array(length);
    case 0x5:
        return new Int32Array(length);
    case 0x6:
        return new Float32Array(length);
    case 0x7:
        return new Float64Array(length);
    }
};

const getTypedArrayReader = (array): string => {
    switch (array[Symbol.toStringTag]) {
    case 'Int8Array':
        return 'getInt8';
    case 'Int16Array':
        return 'getInt16';
    case 'Int32Array':
        return 'getInt32';
    case 'Uint8Array':
        return 'getUint8';
    case 'Uint16Array':
        return 'getUint16';
    case 'Uint32Array':
        return 'getUint32';
    case 'Float32Array':
        return 'getFloat32';
    case 'Float64Array':
        return 'getFloat64';
    }
};

const decodeTypedArray = (dv: DataView, offset: number): [number, TypedArray] => {
    const data = dv.getUint32(offset);
    offset += 4;

    const array = initTypedArray(data);
    const length = array.length;
    const bytePerElement = array.BYTES_PER_ELEMENT;
    const readData = getTypedArrayReader(array);
    // const getUint = `getUint${bytePerElement * 8}`;
    for (let i = 0; i < length; i++) {
        array[i] = dv[readData](offset);
        offset += bytePerElement;
    }
    return [offset, array];
};

export class XYZTerra {
    static decode(data: ArrayBuffer): { indices: TypedArray, vertices: TypedArray } {
        const dv = new DataView(data);
        const [offset, indices] = decodeTypedArray(dv, 0);
        const vertices = decodeTypedArray(dv, offset)[1];
        return {indices, vertices};
    }
}
