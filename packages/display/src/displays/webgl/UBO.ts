/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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
export type UBOIndex = number;

export interface UBO {
    index: UBOIndex;
    buffer: WebGLBuffer | null;
    data?: Float32Array;
    dirty?: boolean;
}

const VIEW_UBO_FLOATS = 16 + 4; // mat4 + vec4 padding

export function createViewUBO(index: number): UBO {
    return {
        index,
        buffer: null,
        dirty: true,
        data: new Float32Array(VIEW_UBO_FLOATS)
    };
}
