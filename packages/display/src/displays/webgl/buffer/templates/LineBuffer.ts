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

import {FlexAttribute, TemplateBuffer} from './TemplateBuffer';
import {FlexArray} from './FlexArray';
import {Raycaster} from '../../Raycaster';
import {GeometryBuffer} from '../GeometryBuffer';
import {Attribute} from '../Attribute';

export class LineBuffer extends TemplateBuffer {
    constructor(flat: boolean = true) {
        super(flat, true);

        if (!flat) {
            // disable culling
            this.cullFace = null;
        }

        this.flexAttributes = {
            // vertex
            a_position: {
                data: new FlexArray(Float32Array),
                size: flat ? 2 : 3
            },
            a_normal: {
                data: new FlexArray(Int16Array),
                size: 4
            },
            a_lengthSoFar: {
                data: new FlexArray(Float32Array),
                size: 1
            }
        };

        this.first = 0;
        // this.first = this.flexAttributes.a_position.data.length / this.flexAttributes.a_position.data.size;
    }

    setIdOffset(featureId: string) {
        this.idOffsets?.push((this.flexAttributes.a_position as FlexAttribute).data.length, featureId);
    }

    rayIntersects(buffer: GeometryBuffer, result, tileX: number, tileY: number, rayCaster: Raycaster): number | string {
        const {attributes} = buffer;
        let position = (attributes.a_position as Attribute).data;
        let normal = (attributes.a_normal as Attribute).data;
        let size = (attributes.a_position as Attribute).size;
        const t0 = [0, 0, 0];
        const t1 = [0, 0, 0];
        const t2 = [0, 0, 0];
        // const matrix = rayCaster.pMat;
        let rayOrigin = rayCaster.origin;
        let rayDirection = rayCaster.direction;
        // let feature;
        // const scaleX = 2 / rayCaster.w;
        // const scaleY = 2 / rayCaster.h;
        let strokeWidth = 0.5 * buffer.getUniform('u_strokeWidth')[0] / rayCaster.scale;
        const scaleByAltitude = <boolean>buffer.getUniform('u_scaleByAltitude');
        const N_SCALE = 1.0 / 8192.0;

        let index;
        const m3 = rayCaster.sMat[3];
        const m7 = rayCaster.sMat[7];
        const m11 = rayCaster.sMat[11];
        const m15 = rayCaster.sMat[15];

        for (let i = 0, n = 0; i < position.length; n += 12) {
            let nx0 = normal[n];
            let ny0 = normal[n + 1];

            const dx0 = (nx0 & 1) * 2 - 1;
            nx0 = dx0 * (nx0 >> 1) * N_SCALE;

            const dy0 = (ny0 & 1) * 2 - 1;
            ny0 = dy0 * (ny0 >> 1) * N_SCALE;

            let x0 = position[i++];
            let y0 = position[i++];
            let z0 = size == 3 ? -position[i++] : 0;
            // convert normalized int16 to float meters (-500m ... +9000m)
            // z0 = (z0 - 32267.0) * 0.14496292001098665;
            let nx1 = normal[n + 4];
            let ny1 = normal[n + 5];

            const dx1 = (nx1 & 1) * 2 - 1;
            nx1 = dx1 * (nx1 >> 1) * N_SCALE;

            const dy1 = (ny1 & 1) * 2 - 1;
            ny1 = dy1 * (ny1 >> 1) * N_SCALE;


            let x1 = position[i++];
            let y1 = position[i++];
            let z1 = size == 3 ? -position[i++] : 0;

            let nx2 = normal[n + 8];
            let ny2 = normal[n + 9];

            const dx2 = (nx2 & 1) * 2 - 1;
            nx2 = dx2 * (nx2 >> 1) * N_SCALE;

            const dy2 = (ny2 & 1) * 2 - 1;
            ny2 = dy2 * (ny2 >> 1) * N_SCALE;

            let x2 = position[i++];
            let y2 = position[i++];
            let z2 = size == 3 ? -position[i++] : 0;

            const tileX0 = tileX + x0;
            const tileY0 = tileY + y0;
            const scaleDZ = 1 + (scaleByAltitude ? 0 : z0 * m11 / (m3 * tileX0 + m7 * tileY0 + m15));


            t0[0] = tileX0 + nx0 * strokeWidth * scaleDZ;
            t0[1] = tileY0 + ny0 * strokeWidth * scaleDZ;
            t0[2] = z0;

            t1[0] = tileX + x1 + nx1 * strokeWidth * scaleDZ;
            t1[1] = tileY + y1 + ny1 * strokeWidth * scaleDZ;
            t1[2] = z1;

            t2[0] = tileX + x2 + nx2 * strokeWidth * scaleDZ;
            t2[1] = tileY + y2 + ny2 * strokeWidth * scaleDZ;
            t2[2] = z2;

            let intersectRayLength = Raycaster.rayIntersectsTriangle(
                rayOrigin,
                rayDirection,
                t0, t1, t2
            );

            if (intersectRayLength != null) {
                if (intersectRayLength <= result.z) {
                    result.z = intersectRayLength;
                    index = i - size;
                }
            }
        }

        if (index != null) {
            for (let j = 0, {idOffsets} = buffer, {length} = idOffsets; j < length; j += 2) {
                if (index < idOffsets[j]) {
                    return result.id = idOffsets[j + 1];
                }
            }
        }
    }
}
