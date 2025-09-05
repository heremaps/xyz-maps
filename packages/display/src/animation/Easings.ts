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


export type Easing = (t: number) => number;

export const linear: Easing = (t: number): number => {
    return t;
};

export const easeOut: Easing = (t: number): number => {
    return 1 - Math.pow(1 - t, 1.5);
};

export const easeOutSine: Easing = (t: number): number => {
    return Math.sin((Math.PI * t) * .5);
};

export const easeOutCubic: Easing = (t: number): number => {
    t = 1 - t;
    return 1 - t * t * t;
};

