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

export type FontStyle = {
    font?: string;
    textAlign?: string;
    strokeWidth?: number;
    stroke?: string;
    fill?: string;
}

class GlyphTexture extends Texture {
    private atlas: GlyphAtlas;
    private dirty: boolean = false;

    constructor(gl: WebGLRenderingContext, style: FontStyle, size?: number) {
        super(gl);

        const {dpr} = <any>gl;
        this.atlas = new GlyphAtlas(style, dpr, size);

        this.format = gl.LUMINANCE_ALPHA;
    }

    addChars(text: string) {
        this.dirty = this.atlas.addChars(text) || this.dirty;
    }

    getAtlas() {
        return this.atlas;
    }

    sync() {
        if (this.dirty) {
            const {atlas} = this;
            const glyphs = atlas.glyphInfos;

            this.set({width: atlas.width, height: atlas.height});
            for (let c in glyphs) {
                let glyphInfo = glyphs[c];
                this.set(glyphInfo.glyph.data, glyphInfo.u1, glyphInfo.v1);
            }
        }
    }

    destroy() {
        this.atlas = null;
        super.destroy();
    }
}

export {GlyphTexture};
