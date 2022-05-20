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

import {FlexAttribute, TemplateBuffer} from './TemplateBuffer';
import {FlexArray} from './FlexArray';
import {GeometryBuffer, IndexGrp} from '../GeometryBuffer';
import {Raycaster} from '../../Raycaster';

export class PolygonBuffer extends TemplateBuffer {
    flexAttributes: {
        'a_position': FlexAttribute
    };

    constructor(flat: boolean = true) {
        super(flat, true);

        this.flexAttributes = {
            'a_position': {
                data: new FlexArray(Float32Array),
                size: flat ? 2 : 3
            }
        };


        this.first = 0;
        // this.first = this.flexAttributes.a_position.data.length / this.flexAttributes.a_position.data.size;
    }

    setIdOffset(featureId: string) {
        this.idOffsets?.push(this.flexAttributes.a_position.data.length, featureId);
    }

    rayIntersects(buffer: GeometryBuffer, result: { z: number }, tileX: number, tileY: number, rayCaster: Raycaster): number | string {
        const {attributes} = buffer;
        const position = attributes.a_position.data;
        const size = attributes.a_position.size;
        const rayOrigin = rayCaster.origin;
        const rayDirection = rayCaster.direction;
        const t0 = [0, 0, 0];
        const t1 = [0, 0, 0];
        const t2 = [0, 0, 0];
        let resultId = null;

        for (let group of buffer.groups) {
            const indexData = (<IndexGrp>group).index?.data;
            let bufferIndex = null;

            if (group.mode == GeometryBuffer.MODE_GL_LINES) continue;

            for (let i = 0; i < indexData.length; i += 3) {
                const i0 = indexData[i] * size;
                const i1 = indexData[i + 1] * size;
                const i2 = indexData[i + 2] * size;
                // for (let i = 0; i < position.length; i += size) {
                t0[0] = tileX + position[i0];
                t0[1] = tileY + position[i0 + 1];
                t0[2] = size == 3 ? -position[i0 + 2] : 0;

                t1[0] = tileX + position[i1];
                t1[1] = tileY + position[i1 + 1];
                t1[2] = size == 3 ? -position[i1 + 2] : 0;

                t2[0] = tileX + position[i2];
                t2[1] = tileY + position[i2 + 1];
                t2[2] = size == 3 ? -position[i2 + 2] : 0;

                const intersectRayLength = Raycaster.rayIntersectsTriangle(rayOrigin, rayDirection, t0, t1, t2);

                if (intersectRayLength) {
                    if (intersectRayLength < result.z) {
                        bufferIndex = i0;
                        // bufferIndex = Math.max(i0, i1, i2);
                        result.z = intersectRayLength;
                    }
                }
            }

            if (bufferIndex != null) {
                for (let i = 0, {idOffsets} = buffer, {length} = idOffsets; i < length; i += 2) {
                    if (bufferIndex < idOffsets[i]) {
                        resultId = idOffsets[i + 1];
                        break;
                    }
                }
            }
        }

        return resultId;
    }
}
