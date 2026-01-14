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

export type TextureData = {
    width: number;
    height: number;
    data?: Uint8Array | Uint8ClampedArray | Float32Array;
    colorSpace?: string;
}
export type ImageData = HTMLCanvasElement | HTMLImageElement | ImageBitmap | TextureData;

const isPowerOf2 = (size: number) => (size & (size - 1)) == 0;

export type TextureOptions = {
    type?: GLenum,
    flipY?: boolean,
    format?: GLenum,
    internalFormat?: GLenum;
    float?: boolean;
    premultiplyAlpha?: boolean,
    mipMaps?: boolean
    wrapS?: GLenum;
    wrapT?: GLenum;
    // /**
    //  * If true, the original pixel/source data for this texture
    //  * is preserved in system (CPU) memory even after uploading
    //  * the texture to the GPU.
    //  *
    //  * Useful when you need to:
    //  * - directly read or analyze pixel values on the CPU
    //  * - regenerate or re-upload the texture after context loss
    //  * - perform image processing or debugging
    //  *
    //  * Note:
    //  * Keeping the source data increases memory usage
    //  * since both a CPU copy and a GPU copy will exist.
    //  *
    //  * Default: false
    //  */
    // preserveSourceData?: boolean;
}

class Texture {
    width: number;
    height: number;

    format: GLenum;
    private internalFormat: number;

    protected texture: WebGLTexture;
    protected gl: WebGLRenderingContext;

    private flipY: boolean;
    private premultiplyAlpha: boolean;
    private mipMaps: boolean;
    private wrapS: GLenum;
    private wrapT: GLenum;

    ref?: number; // reference counter for Texture sharing
    private type: GLenum;
    private minFilter: GLenum;
    private magFilter: GLenum;

    // preserveSourceData: boolean;

    constructor(gl: WebGLRenderingContext, image?: ImageData, options: TextureOptions = {}) {
        this.gl = gl;
        this.format = options.format || gl.RGBA;
        this.internalFormat = options.internalFormat || this.format;
        this.flipY = options.flipY || false;

        let mipmaps = options.mipMaps ?? true;
        let type = options.type ?? gl.UNSIGNED_BYTE;

        const textureData = (image as TextureData)?.data;
        const float = options.float || textureData instanceof Float32Array;


        let minFilter: GLenum;
        let magFilter: GLenum;

        if (float) {
            type = gl.FLOAT;
            if (!(options.format && options.internalFormat)) {
                // this.format = this.internalFormat = gl.RGBA;
                if (gl instanceof WebGL2RenderingContext) {
                    this.internalFormat = gl.R32F;
                    this.format = gl.RED;
                } else {
                    this.format = this.internalFormat = gl.LUMINANCE; // mock gl.R32F
                }
            }
            minFilter = magFilter = gl.NEAREST;
            (image as TextureData).width ??= Math.sqrt(textureData.length);
            (image as TextureData).height ??= (image as TextureData).width;
        }

        this.type = type;
        // this.preserveSourceData = !!options.preserveSourceData;
        this.mipMaps = mipmaps;
        this.wrapS = options.wrapS ?? gl.CLAMP_TO_EDGE;
        this.wrapT = options.wrapT ?? gl.CLAMP_TO_EDGE;
        this.premultiplyAlpha = options.premultiplyAlpha ?? true;
        this.minFilter = minFilter ?? gl.LINEAR;
        this.magFilter = magFilter ?? gl.LINEAR;

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

    set(image: ImageData, x?: number, y?: number) {
        let {gl, texture, format, internalFormat, flipY, wrapS, wrapT, type, minFilter, magFilter} = this;

        const {width, height} = image;
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
                gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, format, gl.UNSIGNED_BYTE, image);
            } else {
                gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, image.data);
            }
            this.width = width;
            this.height = height;
        } else {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, x || 0, y || 0, format, type, image as HTMLImageElement);
        }

        if (this.mipMaps && width == height && isPowerOf2(height)) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
        }
    }

    destroy() {
        const {gl, texture} = this;
        if (texture) {
            gl.deleteTexture(texture);
            this.texture = null;
        }
    }

    isDestroyed(): boolean {
        return this.texture === null;
    }

    getGLTexture(): WebGLTexture {
        return this.texture;
    }
}

export {Texture};
