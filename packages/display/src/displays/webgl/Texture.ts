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
export type Image =
    | HTMLCanvasElement
    | HTMLImageElement
    | ImageBitmap
    | {
    width: number;
    height: number;
    data?: Uint8Array | Uint8ClampedArray;
    colorSpace?: string;
};

const isPowerOf2 = (size: number) => (size & (size - 1)) == 0;

export type TextureOptions = {
    flipY?: boolean,
    format?: GLenum,
    halfFloat?: boolean,
    premultiplyAlpha?: boolean,
    mipMaps?: boolean
    wrapS?: GLenum;
    wrapT?: GLenum;
}

class Texture {
    width: number;
    height: number;

    format: GLenum;

    protected texture: WebGLTexture;
    protected gl: WebGLRenderingContext;

    private flipY: boolean;
    private halfFloat: boolean;
    private premultiplyAlpha: boolean;
    private mipMaps: boolean;
    private wrapS: GLenum;
    private wrapT: GLenum;

    ref?: number; // reference counter for Texture sharing

    constructor(gl: WebGLRenderingContext, image?: Image, options: TextureOptions = {}) {
        this.gl = gl;
        this.format = options.format || gl.RGBA;
        this.flipY = options.flipY || false;
        this.halfFloat = options.halfFloat || false;
        this.mipMaps = options.mipMaps ?? true;
        this.wrapS = options.wrapS ?? gl.CLAMP_TO_EDGE;
        this.wrapT = options.wrapT ?? gl.CLAMP_TO_EDGE;
        this.premultiplyAlpha = options.premultiplyAlpha == undefined
            ? true
            : options.premultiplyAlpha;

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
        let {gl, texture, format, flipY, wrapS, wrapT} = this;
        const {width, height} = image;
        let internalformat = format;
        const isSubImage = typeof x == 'number';

        if (!texture) {
            this.texture = texture = gl.createTexture();
        }

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);

        if (!isSubImage && (this.width != width || this.height || height)) {
            if (image instanceof HTMLCanvasElement || image instanceof HTMLImageElement || image instanceof ImageBitmap) {
                gl.texImage2D(gl.TEXTURE_2D, 0, internalformat, format, gl.UNSIGNED_BYTE, image);
            } else {
                let type = gl.UNSIGNED_BYTE;
                if (this.halfFloat) {
                    type = gl.getExtension('OES_texture_half_float')?.HALF_FLOAT_OES;
                    gl.getExtension('OES_texture_half_float_linear');
                }
                gl.texImage2D(gl.TEXTURE_2D, 0, internalformat, width, height, 0, format, type, image.data);
            }
            this.width = width;
            this.height = height;
        } else {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, x || 0, y || 0, format, gl.UNSIGNED_BYTE, <HTMLCanvasElement | HTMLImageElement>image);
        }

        if (this.mipMaps && width == height && isPowerOf2(height)) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }
    }

    onDestroyed(tex: Texture) {
    }

    destroy() {
        const {gl, texture} = this;
        if (texture) {
            gl.deleteTexture(texture);
        }
        this.texture = null;
        this.onDestroyed(this);
    }

    getGLTexture(): WebGLTexture {
        return this.texture;
    }
}

export {Texture};
