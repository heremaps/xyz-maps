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

import {GeometryBuffer} from './GeometryBuffer';
import {addLineString, normalize} from './addLineString';
import {createTextData} from './createText';
import {GlyphTexture} from '../GlyphTexture';
import {toRGB} from '../color';
import {LineBuffer} from './templates/LineBuffer';

const createTileBuffer = (tileSize: number) => {
    // 0 ------- 1
    // |      /  |
    // |    /    |
    // |  /      |
    // 3 ------- 2

    const gridTileBuffer = new GeometryBuffer([
        0, 1, 3,
        3, 1, 2
    ], 'Polygon');

    const TypedArray = tileSize > 256 ? Int16Array : Int8Array;

    gridTileBuffer.addAttribute('a_position', {
        data: new TypedArray([
            0, 0,
            tileSize, 0,
            tileSize, tileSize,
            0, tileSize
        ]),
        size: 2
    });

    gridTileBuffer.addUniform('u_zIndex', 0.0);
    gridTileBuffer.addUniform('u_fill', [1.0, 1.0, 1.0, 1.0]);
    gridTileBuffer.scissor = true;
    gridTileBuffer.depth = false;
    gridTileBuffer.alpha = false;

    return gridTileBuffer;
};

export {createTileBuffer};

const createGridTileBuffer = (color: number[] = [1.0, 0.0, 0.0, 1.0], strokeWidth: number = 2) => {
    const lineBuffer = new LineBuffer();
    const {attributes} = lineBuffer;
    const tileSize = 1;

    addLineString(
        <any>attributes.a_position.data,
        <any>attributes.a_normal.data,
        new Float32Array([0, 0, tileSize, 0, tileSize, tileSize, 0, tileSize, 0, 0]),
        10,
        4 * tileSize,
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

    geoBuffer.scissor = false;
    geoBuffer.depth = false;

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

    const vertices = createTextData(quadkey + ' L' + quadkey.length, glyphs.atlas);
    const position = vertices.position;

    let textBuffer = new GeometryBuffer({
        first: 0,
        count: vertices.count
    }, 'Text');
    // textBuffer.addAttribute('a_position', {
    //     data: new Int8Array(position.length),
    //     size: 2,
    //     stride: 0
    // });
    textBuffer.addAttribute('a_point', {
        data: position,
        size: 2,
        stride: 0
    });
    textBuffer.addAttribute('a_texcoord', {
        data: vertices.texcoord,
        size: 2,
        stride: 0
    });


    textBuffer.depth = false;
    textBuffer.scissor = false;
    textBuffer.texture = glyphs;
    textBuffer.addUniform('u_texture', 0);
    textBuffer.addUniform('u_atlasScale', 1 / glyphs.width);
    textBuffer.addUniform('u_opacity', 1.0);
    textBuffer.addUniform('u_alignMap', true);
    textBuffer.addUniform('u_fillColor', toRGB(font.fill));
    textBuffer.addUniform('u_strokeColor', toRGB(font.stroke));

    return textBuffer;
};

export {createGridTextBuffer};
