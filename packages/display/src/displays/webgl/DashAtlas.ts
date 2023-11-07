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
import {SharedTexture} from './Atlas';

type DashArray = [number, number, number?];

class DashAtlas {
    private gl: WebGLRenderingContext;
    private data: { [id: string]: SharedTexture } = {};

    // scale by 10 to allow 0.1 meter precision
    scale: number = 10;

    constructor(gl: WebGLRenderingContext) {
        this.gl = gl;
    }

    private create(dashArray: DashArray) {
        let size = dashArray.reduce((a, b) => a + b);
        let {scale} = this;

        size *= scale;

        const pixels = new Uint8Array(size);
        const {gl} = this;
        let fill = true;
        let offset = 0;

        while (offset < size) {
            for (let bytes of dashArray) {
                bytes *= scale;
                if (fill) {
                    pixels.fill(255, offset, offset + bytes);
                }
                offset += bytes;
                fill = !fill;
            }
        }

        return new SharedTexture(gl, {
            width: pixels.length,
            height: 1,
            data: pixels
        }, {
            format: gl.LUMINANCE
        });
    }

    get(dashArray: DashArray, dashImage?): SharedTexture {
        const id = String(dashArray);
        let dashData = this.data[id];

        if (!dashData) {
            dashData = this.data[id] = this.create(dashArray);
        }

        return dashData;
    }
}

export {DashAtlas, DashArray};
