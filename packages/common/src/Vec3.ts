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

export type Vec3 = number[];

export const sub = (result: Vec3, a: Vec3, b: Vec3): Vec3 => {
    result[0] = a[0] - b[0];
    result[1] = a[1] - b[1];
    result[2] = a[2] - b[2];
    // result[2] = a[2] || 0 - b[2] || 0;
    return result;
};

export const add = (result: Vec3, a: Vec3, b: Vec3): Vec3 => {
    result[0] = a[0] + b[0];
    result[1] = a[1] + b[1];
    result[2] = a[2] + b[2];
    // result[2] = a[2] || 0 + b[2] || 0;
    return result;
};

export const scale = (result: Vec3, a: Vec3, t: number): Vec3 => {
    result[0] = a[0] * t;
    result[1] = a[1] * t;
    result[2] = a[2] * t;
    return result;
};

export const normalize = (result: Vec3, a: Vec3): Vec3 => {
    const x = a[0];
    const y = a[1];
    const z = a[2];
    let length = x * x + y * y + z * z;
    if (length > 0) {
        length = 1 / Math.sqrt(length);
    }
    result[0] = a[0] * length;
    result[1] = a[1] * length;
    result[2] = a[2] * length;
    return result;
};
export const cross = (out: Vec3, a: Vec3, b: Vec3): Vec3 => {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const bx = b[0];
    const by = b[1];
    const bz = b[2];
    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
};

export const transform = (out: Vec3, a: Vec3, mat4: number[]): Vec3 => {
    const x = a[0];
    const y = a[1];
    const z = a[2] || 0;
    let w = mat4[3] * x + mat4[7] * y + mat4[11] * z + mat4[15];
    w ||= 1;
    out[0] = (mat4[0] * x + mat4[4] * y + mat4[8] * z + mat4[12]) / w;
    out[1] = (mat4[1] * x + mat4[5] * y + mat4[9] * z + mat4[13]) / w;
    out[2] = (mat4[2] * x + mat4[6] * y + mat4[10] * z + mat4[14]) / w;
    return out;
};

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
