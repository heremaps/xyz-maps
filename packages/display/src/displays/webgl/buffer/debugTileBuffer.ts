/*
 * Copyright (C) 2019-2023 HERE Europe B.V.
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

import {GeometryBuffer} from './GeometryBuffer';
import {addLineString} from './addLineString';
import {createTextData} from './createText';
import {GlyphTexture} from '../GlyphTexture';
import {LineBuffer} from './templates/LineBuffer';
import {FlexArray} from './templates/FlexArray';
import {FlexAttribute} from './templates/TemplateBuffer';
import {PASS} from '../program/GLStates';
import {createImageBuffer} from './createImageBuffer';
import {Color as ColorUtils} from '@here/xyz-maps-common';
import {CompiledUniformMap} from '../program/Program';

const {toRGB} = ColorUtils;

export type StencilTileBuffer = GeometryBuffer & { uniforms: CompiledUniformMap };
export const createStencilTileBuffer = (tileSize: number, gl: WebGLRenderingContext) : StencilTileBuffer => {
    const tileBuffer: StencilTileBuffer = createImageBuffer({
        width: 1,
        height: 1,
        data: new Uint8ClampedArray([255, 255, 255, 255])
    }, gl, 1, false) as StencilTileBuffer;
    tileBuffer.id = 'StencilTile';
    tileBuffer.clip = true;
    tileBuffer.depth = false;
    tileBuffer.pass = PASS.OPAQUE;
    // tileBuffer.uniforms.u_snapGrid = false;
    return tileBuffer;
};

const createGridTileBuffer = (tileSize: number = 1, color: number[] = [1.0, 0.0, 0.0, 1.0], strokeWidth: number = 2) => {
    const lineBuffer = new LineBuffer();
    const {flexAttributes} = lineBuffer;

    addLineString(
        (flexAttributes.a_position as FlexAttribute).data,
        (flexAttributes.a_normal as FlexAttribute).data,
        new Float32Array([0, 0, tileSize, 0, tileSize, tileSize, 0, tileSize, 0, 0]),
        new Float32Array([0, tileSize, 2 * tileSize, 3 * tileSize, 4 * tileSize]),
        10,
        2,
        0,
        tileSize,
        false,
        'butt',
        'none',
        strokeWidth
    );

    const geoBuffer = lineBuffer.finalize('Line');

    geoBuffer.addUniform('u_zIndex', 0.0);
    geoBuffer.addUniform('u_fill', color);
    geoBuffer.addUniform('u_strokeWidth', [strokeWidth, 0]);
    geoBuffer.addUniform('u_offset', [0, 0]);

    geoBuffer.clip = false;
    geoBuffer.depth = false;
    geoBuffer.pass = PASS.ALPHA;

    return geoBuffer;
};

export {createGridTileBuffer};


let glyphs;

const createGridTextBuffer = (quadkey: string, gl: WebGLRenderingContext, font) => {
    if (!glyphs) {
        glyphs = new GlyphTexture(gl, font);
        glyphs.addChars('L0123456789');
        glyphs.sync();
    }

    const text = quadkey + ' L' + quadkey.length;
    const {length} = text;


    // if (!positions) {
    const positions = new FlexArray(Int16Array, length * 18);
    // } else {
    //     positions.reserve(length * 18);
    // }

    // if (!texcoords) {
    const texcoords = new FlexArray(Uint16Array, length * 12);
    // } else {
    //     texcoords.reserve(length * 12);
    // }

    const {position, count, texcoord} = createTextData(text, glyphs.atlas, positions, texcoords);

    let textBuffer = new GeometryBuffer({
        first: 0,
        count
    }, 'Text');
    //
    textBuffer.addAttribute('a_position', {
        // set visibility bit
        data: new Int8Array(position.length).fill(1),
        size: 2,
        stride: 0
    });
    textBuffer.addAttribute('a_point', {
        data: position,
        size: 2,
        stride: 0
    });
    textBuffer.addAttribute('a_texcoord', {
        data: texcoord,
        size: 2,
        stride: 0
    });


    textBuffer.pass = PASS.ALPHA;
    textBuffer.depth = false;
    textBuffer.clip = false;
    // textBuffer.texture = glyphs;
    textBuffer.addUniform('u_texture', glyphs);
    textBuffer.addUniform('u_texSize', [glyphs.width, glyphs.height]);
    textBuffer.addUniform('u_opacity', 1.0);
    textBuffer.addUniform('u_alignMap', true);
    textBuffer.addUniform('u_fillColor', toRGB(font.fill));
    textBuffer.addUniform('u_strokeColor', toRGB(font.stroke));

    return textBuffer;
};

export {createGridTextBuffer};
