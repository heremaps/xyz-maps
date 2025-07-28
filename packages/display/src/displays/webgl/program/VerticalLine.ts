/*
 * Copyright (C) 2019-2025 HERE Europe B.V.
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
import PolygonProgram from './Polygon';
import {GeometryBuffer} from '../buffer/GeometryBuffer';

class VerticalLineProgram extends PolygonProgram {
    name = 'VerticalLine';

    static getProgramId(buffer: GeometryBuffer, macros?: { [name: string]: string | number | boolean }) {
        return 'VerticalLine';
    }

    static getMacros(buffer: GeometryBuffer) {
        return null;
    }

    constructor(gl: WebGLRenderingContext, devicePixelRation: number, macros?: { [name: string]: string | number | boolean }) {
        super(gl, devicePixelRation, macros);
        this.mode = gl.LINES;
    }
}


export default VerticalLineProgram;
