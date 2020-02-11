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

import {Texture} from './Texture';
import {GlyphAtlas} from './GlyphAtlas';


class GlyphTexture extends Texture {
    private atlas: GlyphAtlas;
    private dirty: boolean = false;

    constructor(gl: WebGLRenderingContext, style, blockSize: number = 256) {
        // blockSize *= window.devicePixelRatio;
        super(gl);
        const {dpr} = <any>gl;
        this.atlas = new GlyphAtlas(style, dpr, blockSize, blockSize);
        // this.format = gl.LUMINANCE_ALPHA;
    }

    // time = 0;

    addChars(text: string) {
        // const t = performance.now();
        this.dirty = this.atlas.addChars(text) || this.dirty;
        // this.time+=performance.now()-t;
    }

    getAtlas() {
        return this.atlas;
    }

    sync() {
        if (this.dirty) {
            // console.time('sync');
            this.set(this.atlas.canvas);
            delete this.atlas.canvas;
            // this.dirty = false;
            // console.timeEnd('sync');
        }
    }

    bind() {
        // this.sync();
        super.bind();
    }

    destroy() {
        this.atlas = null;
        super.destroy();
    }
}

export {GlyphTexture};
