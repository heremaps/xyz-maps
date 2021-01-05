/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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

import {SharedTexture} from './Atlas';

type DashArray = [number, number, number?];

class DashAtlas {
    private gl: WebGLRenderingContext;
    private data: { [id: string]: SharedTexture } = {};

    constructor(gl: WebGLRenderingContext) {
        this.gl = gl;
    }

    create(dashArray: DashArray) {
        let size = dashArray.reduce((a, b) => a + b)
            // double size for odd dasharray size to get repeating pattern
            * (dashArray.length % 2 + 1);

        // repeat pattern to roughly fit a complete tile to improve antialiasing of long lines
        size *= Math.ceil(512 / size);

        const pixels = new Uint8Array(size);
        let fill = true;
        let offset = 0;

        while (offset < size) {
            for (let bytes of dashArray) {
                if (fill) {
                    pixels.fill(255, offset, offset + bytes);
                }
                offset += bytes;
                fill = !fill;
            }
        }

        return new SharedTexture(this.gl, {
            width: pixels.length,
            height: 1,
            pixels: pixels
        }, this.gl.LUMINANCE);
    }

    get(dashArray: DashArray): SharedTexture {
        const id = String(dashArray);
        let dashData = this.data[id];

        if (!dashData) {
            dashData = this.data[id] = this.create(dashArray);
        }

        return dashData;
    }
}

export {DashAtlas, DashArray};
