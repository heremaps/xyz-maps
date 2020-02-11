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

import {GeometryBuffer} from './GeometryBuffer';
import {Texture} from '../Texture';

const textureCoordinates = [
    0, 0,
    1, 0,
    1, 1,
    0, 0,
    1, 1,
    0, 1
];

const createImageBuffer = (img: HTMLImageElement | HTMLCanvasElement, gl: WebGLRenderingContext, size: number) => {
    // const id = (<any>img)._id || ((<any>img)._id = String(Math.random()));
    // const texInfo = atlas.get(id) || atlas.set(id, img); // [UNIT,X,Y]

    const tileBuffer = new GeometryBuffer({first: 0, count: 6}, 'Image');
    const positionCoordinates = new Int16Array(12);

    positionCoordinates[0] = 0;
    positionCoordinates[1] = 0;

    positionCoordinates[2] = size;
    positionCoordinates[3] = 0;

    positionCoordinates[4] = size;
    positionCoordinates[5] = size;

    positionCoordinates[6] = 0;
    positionCoordinates[7] = 0;

    positionCoordinates[8] = size;
    positionCoordinates[9] = size;

    positionCoordinates[10] = 0;
    positionCoordinates[11] = size;

    tileBuffer.addAttribute('a_position', {
        data: positionCoordinates,
        size: 2,
        stride: 0
    });
    tileBuffer.addAttribute('a_textureCoord', {
        data: new Int8Array(textureCoordinates),
        size: 2,
        stride: 0
    });

    tileBuffer.texture = new Texture(gl, img);
    tileBuffer.addUniform('u_sampler', 0);

    return tileBuffer;
};

export {createImageBuffer};
