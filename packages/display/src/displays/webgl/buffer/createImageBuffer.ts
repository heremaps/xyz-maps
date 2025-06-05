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

import {GeometryBuffer} from './GeometryBuffer';
import {ImageData, Texture} from '../Texture';
import {PASS} from '../program/GLStates';
import {BACK, FRONT} from './glType';

const textureCoordinates = [
    0, 0,
    1, 0,
    0, 1,

    0, 1,
    1, 0,
    1, 1
];

const createImageBuffer = (img: ImageData, gl: WebGLRenderingContext, size: number, alpha: boolean) => {
    // const id = (<any>img)._id || ((<any>img)._id = String(Math.random()));
    // const texInfo = atlas.get(id) || atlas.set(id, img); // [UNIT,X,Y]

    const tileBuffer = new GeometryBuffer({first: 0, count: 6}, 'Image');

    // 0 ------- 1
    // |      /  |
    // |    /    |
    // |  /      |
    // 3 ------- 2
    tileBuffer.addAttribute('a_position', {
        data: new Int16Array([
            0, 0,
            size, 0,
            0, size,

            0, size,
            size, 0,
            size, size
        ]),
        size: 2,
        stride: 0
    });
    tileBuffer.addAttribute('a_textureCoord', {
        data: new Int8Array(textureCoordinates),
        size: 2,
        stride: 0
    });

    tileBuffer.addUniform('u_tileScale', 1);
    tileBuffer.addUniform('u_sampler', new Texture(gl, img));
    tileBuffer.zIndex = 0;
    tileBuffer.clip = true;
    tileBuffer.blend = alpha;
    tileBuffer.pass = alpha ? PASS.ALPHA : PASS.OPAQUE;
    tileBuffer.pixelPerfect = true;
    tileBuffer.pointerEvents = false;
    tileBuffer.cullFace(FRONT);

    // tileBuffer.uniforms.u_snapGrid = true;

    return tileBuffer;
};

export {createImageBuffer};
