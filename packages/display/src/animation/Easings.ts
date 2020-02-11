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

export const easeInSine = (t: number, b: number, c: number, d: number): number => {
    return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
};

export const easeOutSine = (t: number, b: number, c: number, d: number): number => {
    return c * Math.sin(t / d * (Math.PI / 2)) + b;
};

export const easeInQuint = (t: number, b: number, c: number, d: number): number => {
    return c * (t /= d) * t * t * t * t + b;
};

export const easeOutQuint = (t: number, b: number, c: number, d: number): number => {
    return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
};

export const easeInCirc = (t: number, b: number, c: number, d: number): number => {
    return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
};

export const easeOutCirc = (t: number, b: number, c: number, d: number): number => {
    return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
};

export const easeInCubic = (t: number, b: number, c: number, d: number): number => {
    t /= d;
    return c * t * t * t + b;
};

export const easeOutCubic = (t: number, b: number, c: number, d: number): number => {
    t /= d;
    t--;
    return c * (t * t * t + 1) + b;
};

