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

let c = document.createElement('canvas');
let ctx = c.getContext('2d');
let defaultStr = 'abcdefghijklmnopqrstuvwxyz';

defaultStr = defaultStr + defaultStr.toUpperCase() + '0123456789';

let defaultStrLen = defaultStr.length;
let size = {};
let txt = {};


const defaultFont = 'normal 12px Arial';

const measure = (font: string) => {
    if (!size[font]) {
        ctx.font = font;

        size[font] = ctx.measureText(defaultStr).width / defaultStrLen;
    }

    return size[font];
};

const createTxtRef = (ref) => {
    return txt[ref] = txt[ref] || new Function('f', 'return f.' + ref);
};

export {defaultFont, measure, createTxtRef};
