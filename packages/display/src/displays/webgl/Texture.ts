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

type Image = HTMLCanvasElement | HTMLImageElement | { width: number, height: number, pixels?: Uint8Array } ;


const isPowerOf2 = (size: number) => (size & (size - 1)) == 0;

class Texture {
    width: number;
    height: number;

    format: GLenum;

    protected texture: WebGLTexture;
    protected gl: WebGLRenderingContext;

    constructor(gl: WebGLRenderingContext, image?: Image) {
        this.gl = gl;
        // this.texture = gl.createTexture();

        this.format = gl.RGBA;

        if (image) {
            this.set(image);
        }
    }

    bind() {
        const {gl, texture} = this;
        if (texture) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
        }
    }

    set(image: Image, x?: number, y?: number) {
        let {gl, texture, format} = this;
        const {width, height} = image;
        const internalformat = format;
        const isSubImage = typeof x == 'number';

        if (!texture) {
            this.texture = texture = gl.createTexture();
        }

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // GL.REPEAT
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);// GL.REPEAT

        if (!isSubImage && (this.width != width || this.height || height)) {
            if (image instanceof HTMLCanvasElement || image instanceof HTMLImageElement) {
                gl.texImage2D(gl.TEXTURE_2D, 0, internalformat, format, gl.UNSIGNED_BYTE, image);
            } else {
                gl.texImage2D(gl.TEXTURE_2D, 0, internalformat, width, height, 0, format, gl.UNSIGNED_BYTE, image.pixels);
            }
            this.width = width;
            this.height = height;
        } else {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, x || 0, y || 0, format, gl.UNSIGNED_BYTE, <HTMLCanvasElement | HTMLImageElement>image);
        }

        if (width == height && isPowerOf2(height)) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }
    }

    destroy() {
        const {gl, texture} = this;
        if (texture) {
            gl.deleteTexture(texture);
            this.texture = null;
        }
    }
}

export {Texture, Image};
