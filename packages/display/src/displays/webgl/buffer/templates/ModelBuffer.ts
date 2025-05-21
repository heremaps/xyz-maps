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

import {FlexArray} from './FlexArray';
import {ConstantAttribute, FlexAttribute, TemplateBuffer} from './TemplateBuffer';
import {GeometryBuffer, IndexGrp} from '../GeometryBuffer';
import {Raycaster} from '../../Raycaster';

import {scale, rotate, multiply, translate, identity, create} from 'gl-matrix/mat4';
import {transformMat4, subtract, scale as scaleVec3, normalize as normalizeVec3} from 'gl-matrix/vec3';
import {isTypedArray, TypedArray} from '../glType';
import {Attribute} from '../Attribute';
import {Color} from '@here/xyz-maps-common';
import {ModelGeometry} from '@here/xyz-maps-core';

import toRGB = Color.toRGB;

enum HitTest {
    bbox,
    geometry
}

const NO_COLOR_WHITE = [1, 1, 1, 1];

type VertexData = TypedArray | number[];

function computeTangents(vertex: VertexData, uv: number[], indices?: Uint16Array | Uint32Array | number[]) {
    const tangents = new Float32Array(vertex.length);
    const p1 = new Float32Array(3);
    const p2 = new Float32Array(3);
    const p3 = new Float32Array(3);
    const uv1 = new Float32Array(3);
    const uv2 = new Float32Array(3);
    const uv3 = new Float32Array(3);
    const length = indices?.length || vertex.length / 3;

    for (let i = 0; i < length; i += 3) {
        let i1 = i;
        let i2 = i + 1;
        let i3 = i + 2;

        if (indices) {
            i1 = indices[i1];
            i2 = indices[i2];
            i3 = indices[i3];
        }

        const pi1 = i1 * 3;
        const pi2 = i2 * 3;
        const pi3 = i3 * 3;

        const ni1 = i1 * 2;
        const ni2 = i2 * 2;
        const ni3 = i3 * 2;

        p1[0] = vertex[pi1];
        p1[1] = vertex[pi1 + 1];
        p1[2] = vertex[pi1 + 2];

        p2[0] = vertex[pi2];
        p2[1] = vertex[pi2 + 1];
        p2[2] = vertex[pi2 + 2];

        p3[0] = vertex[pi3];
        p3[1] = vertex[pi3 + 1];
        p3[2] = vertex[pi3 + 2];

        uv1[0] = uv[ni1];
        uv1[1] = uv[ni1 + 1];
        uv1[2] = uv[ni1 + 2];

        uv2[0] = uv[ni2];
        uv2[1] = uv[ni2 + 1];
        uv2[2] = uv[ni2 + 2];

        uv3[0] = uv[ni3];
        uv3[1] = uv[ni3 + 1];
        uv3[2] = uv[ni3 + 2];

        const dp12 = subtract(p2, p2, p1); // reuse array p2
        const dp13 = subtract(p3, p3, p1); // reuse array p3
        const duv12 = subtract(uv2, uv2, uv1);
        const duv13 = subtract(uv3, uv3, uv1);
        const f = 1.0 / (duv12[0] * duv13[1] - duv13[0] * duv12[1]);
        const tangent = p1; // reuse array p1

        if (Number.isFinite(f)) {
            normalizeVec3(tangent, scaleVec3(tangent, subtract(tangent,
                scaleVec3(dp12, dp12, duv13[1]),
                scaleVec3(dp13, dp13, duv12[1])
            ), f));
        } else {
            tangent[0] = 1;
            tangent[1] = 0;
            tangent[2] = 0;
        }

        tangents[pi1] = tangents[pi2] = tangents[pi3] = tangent[0];
        tangents[pi1 + 1] = tangents[pi2 + 1] = tangents[pi3 + 1] = tangent[1];
        tangents[pi1 + 2] = tangents[pi2 + 2] = tangents[pi3 + 2] = tangent[2];
    };

    return tangents;
}

export class ModelBuffer extends TemplateBuffer {
    destroy?: (buffer: GeometryBuffer) => void;
    // Rotate by 90 degrees along the X-axis (pitch rotation).
    private defaultOrientationMatrix: number[] = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
    // Flip Y and rotate by 90 degrees along the X-axis (pitch rotation).
    // private defaultOrientationMatrix: number[] = [1, 0, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 1];

    static calcBBox(data: ModelGeometry) {
        const {position} = data;
        const infinity = Infinity;
        let minX = infinity;
        let maxX = -infinity;
        let minY = infinity;
        let maxY = -infinity;
        let minZ = infinity;
        let maxZ = -infinity;
        // console.time('calcModelBBox');
        for (let i = 0, x, y, z, {length} = position; i < length; i += 3) {
            x = position[i];
            y = position[i + 1];
            z = position[i + 2];

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;

            if (y < minY) minY = y;
            if (y > maxY) maxY = y;

            if (z < minZ) minZ = z;
            if (z > maxZ) maxZ = z;
        }
        // console.timeEnd('calcModelBBox');
        return [minX, minY, minZ, maxX, maxY, maxZ];
    }

    static init(data: ModelGeometry, attributes: ModelBuffer['flexAttributes'] = {}) {
        if (data) {
            const {position, color, uv} = data;
            let colorRGB: Uint8Array | number[] | string = NO_COLOR_WHITE;
            let size;

            attributes.a_position = {
                data: ModelBuffer.createFlexArray(position),
                size: 3
            };

            const normal = data.normal || GeometryBuffer.computeNormals(position, data.index);
            if (normal) {
                attributes.a_normal = {
                    data: ModelBuffer.createFlexArray(normal),
                    size: 3,
                    normalized: normal instanceof Int8Array || normal instanceof Int16Array
                };
            }

            if (uv) {
                attributes.a_uv = {
                    data: ModelBuffer.createFlexArray(uv),
                    size: 2
                };
            }
            if (uv && normal) {
                const tangents = computeTangents(position, uv, data.index);
                attributes.a_tangent = {
                    data: ModelBuffer.createFlexArray(tangents),
                    size: 3
                };
            } else {
                attributes.a_tangent = {value: [1, 0, 0]};
            }

            if (color) {
                if (isTypedArray(color) || Array.isArray(color)) {
                    const vertexCount = position.length / 3;
                    if (color.length == vertexCount * 4) {
                        // color per vertex
                        colorRGB = color;
                        size = 4;
                    } else if (color.length == vertexCount * 3) {
                        // size = 3;
                        // colorRGB = new Uint8Array(color.map((v) => v * 255));
                        size = 4;
                        colorRGB = new Uint8Array(vertexCount * 4);
                        const colorData = color as number[];
                        for (let c = 0; c < colorData.length; c += 3) {
                            let i = c / 3 * 4;
                            colorRGB[i] = colorData[c] * 255;
                            colorRGB[i + 1] = colorData[c + 1] * 255;
                            colorRGB[i + 2] = colorData[c + 2] * 255;
                            colorRGB[i + 3] = 255;
                        }
                    }
                } else {
                    colorRGB = toRGB(color);
                }
            }
            // const colorData = this.createFlexArray(colorRGB as number[] | Uint8Array);

            attributes.a_color = size ? {
                // data: colorRGB.map((v) => v * 255),
                data: new FlexArray(colorRGB as Uint8Array),
                size,
                normalized: true
            } : {
                value: colorRGB as number[]
            };
        }
        return attributes;
    };

    static createFlexArray(array: TypedArray | number[]) {
        return new FlexArray(isTypedArray(array) ? <TypedArray>array : new Float32Array(array));
    }

    flexAttributes: {
        a_tangent?: FlexAttribute | ConstantAttribute,
        a_position?: FlexAttribute,
        a_modelMatrix?: FlexAttribute,
        a_offset?: FlexAttribute,
        a_color?: FlexAttribute | ConstantAttribute,
        a_uv?: FlexAttribute
        a_normal?: FlexAttribute
    };


    hitTest: HitTest = HitTest.bbox;
    id: string | number;
    bbox: number[];

    constructor(geometryData?: ModelGeometry, material?, modelMatrix?, offset?) {
        super(false);

        this.flexAttributes = {};

        const {flexAttributes} = this;

        ModelBuffer.init(geometryData, flexAttributes);

        if (geometryData?.index) {
            this._index = geometryData.index;
        }

        flexAttributes.a_modelMatrix = modelMatrix || {
            data: new FlexArray(Float32Array),
            size: 16,
            instanced: true
        };

        flexAttributes.a_offset = offset || {
            data: new FlexArray(Float32Array),
            size: 3,
            instanced: true
        };

        this.uniforms = {...material};

        this.light = 'defaultLight';
    }

    addInstance(x: number, y: number, z: number, scaleXYZ?: number[], translateXYZ?: number[], rotation?: number[], transform?) {
        this.instances++;

        const m = new Float32Array(this.defaultOrientationMatrix);

        if (transform) {
            multiply(m, m, transform);
        } else {
            if (translateXYZ) {
                translate(m, m, translateXYZ);
            }

            if (scaleXYZ) {
                scale(m, m, scaleXYZ);
            }

            if (rotation) {
                if (rotation[0]) {
                    rotate(m, m, rotation[0], [1, 0, 0]);
                }
                if (rotation[1]) {
                    rotate(m, m, rotation[1], [0, 1, 0]);
                }
                if (rotation[2]) {
                    rotate(m, m, rotation[2], [0, 0, 1]);
                }
            }
        }

        const flexArray = this.flexAttributes.a_modelMatrix.data;

        flexArray.set(m, flexArray.length);

        this.flexAttributes.a_offset.data.push(x, y, z);

        return m;
    }

    setIdOffset(featureId: string) {
        this.idOffsets?.push(this.flexAttributes.a_modelMatrix.data.length, featureId);
    }

    rayIntersects(buffer: GeometryBuffer, result: {
        z: number
    }, tileX: number, tileY: number, rayCaster: Raycaster): number | string {
        const {attributes} = buffer;
        const positionAttr = attributes.a_position as Attribute;
        const modelMatrixData = (attributes.a_modelMatrix as Attribute).data;
        const positionOffsetData = (attributes.a_offset as Attribute).data;
        const position = positionAttr.data;
        const size = positionAttr.size;
        const rayOrigin = rayCaster.origin;
        const rayDirection = rayCaster.direction;
        const t0 = [0, 0, 0];
        const t1 = [0, 0, 0];
        const t2 = [0, 0, 0];
        let bufferIndex = null;

        for (let m = 0, i = 0, {length} = modelMatrixData; m < length; m += 16, i += 3) {
            const modelMatrix = modelMatrixData.subarray(m, m + 16);
            // const modelMatrix = modelMatrixData.slice(m, m + 16);
            // let rayDirection = transformMat4([], rayDirOrg, modelMatrix);

            if (buffer.bbox) {
                const [minX, minY, minZ, maxX, maxY, maxZ] = buffer.bbox;
                const box = [[minX, minY, minZ], [maxX, maxY, maxZ]];

                let minXWorld = Infinity;
                let minYWorld = Infinity;
                let minZWorld = Infinity;
                let maxXWorld = -Infinity;
                let maxYWorld = -Infinity;
                let maxZWorld = -Infinity;

                const groundRes = 1 / (<number>buffer.uniforms.u_zMeterToPixel || rayCaster.scaleZ);

                for (let p of box) {
                    // p[0] /= groundRes;
                    // p[1] /= groundRes;
                    // p[2] /= groundRes;
                    // transformMat4(p, p, modelMatrix);
                    // p[0] += tileX;
                    // p[1] += tileY;
                    // p[2] *= -groundRes;
                    transformMat4(p, p, modelMatrix);

                    p[0] = p[0] / groundRes + tileX + positionOffsetData[i];
                    p[1] = p[1] / groundRes + tileY + positionOffsetData[i + 1];
                    p[2] = -p[2] - positionOffsetData[i + 2];


                    let [x, y, z] = p;
                    if (x < minXWorld) minXWorld = x;
                    if (x > maxXWorld) maxXWorld = x;
                    if (y < minYWorld) minYWorld = y;
                    if (y > maxYWorld) maxYWorld = y;
                    if (z < minZWorld) minZWorld = z;
                    if (z > maxZWorld) maxZWorld = z;
                }

                const intersectRayLength = rayCaster.intersectAABBox(
                    minXWorld, minYWorld, minZWorld,
                    maxXWorld, maxYWorld, maxZWorld
                );

                const hitTestModeBBox = (buffer.hitTest || 0) == HitTest.bbox;


                if (intersectRayLength != null) {
                    if (hitTestModeBBox) {
                        if (intersectRayLength < result.z) {
                            bufferIndex = m;
                            result.z = intersectRayLength;
                        }
                        continue;
                    }
                } else {
                    continue;
                }
            }

            // scale to tile size in pixel
            const positionScaleX = modelMatrix[m];
            const positionScaleY = modelMatrix[m + 5];
            const positionScaleZ = modelMatrix[m + 10];
            // const translateX = modelMatrix[m+12];
            // const translateY = modelMatrix[m+13];
            // const translateZ = modelMatrix[m+14];


            for (let group of buffer.groups) {
                const indexData = (<IndexGrp>group).index?.data;

                if (group.mode == GeometryBuffer.MODE_GL_LINES) continue;

                // for (let i = 0, i0, i1, i2, positionLength = indexData ? indexData.length : position.length; i < positionLength; i += 3) {
                //     if (indexData) {
                //         i0 = indexData[i] * size;
                //         i1 = indexData[i + 1] * size;
                //         i2 = indexData[i + 2] * size;
                //     } else {
                //         i0 = i * size;
                //         i1 = (i + 1) * size;
                //         i2 = (i + 2) * size;
                //     }

                for (let i = 0; i < indexData.length; i += 3) {
                    const i0 = indexData[i] * size;
                    const i1 = indexData[i + 1] * size;
                    const i2 = indexData[i + 2] * size;

                    // t0[0] = position[i0];
                    // t0[1] = position[i0 + 1];
                    // t0[2] = -position[i0 + 2];
                    // transformMat4(t0, t0, modelMatrix);
                    // t0[0] += tileX;
                    // t0[1] += tileY;
                    //
                    // t1[0] = position[i1];
                    // t1[1] = position[i1 + 1];
                    // t1[2] = -position[i1 + 2];
                    // transformMat4(t1, t1, modelMatrix);
                    // t1[0] += tileX;
                    // t1[1] += tileY;
                    //
                    // t2[0] = position[i2];
                    // t2[1] = position[i2 + 1];
                    // t2[2] = -position[i2 + 2];
                    // transformMat4(t2, t2, modelMatrix);
                    // t2[0] += tileX;
                    // t2[1] += tileY;

                    t0[0] = tileX + position[i0] * positionScaleX;
                    t0[1] = tileY + position[i0 + 1] * positionScaleY;

                    t1[0] = tileX + position[i1] * positionScaleX;
                    t1[1] = tileY + position[i1 + 1] * positionScaleY;

                    t2[0] = tileX + position[i2] * positionScaleX;
                    t2[1] = tileY + position[i2 + 1] * positionScaleY;

                    if (size == 3) {
                        t0[2] = -position[i0 + 2] * positionScaleZ;
                        t1[2] = -position[i1 + 2] * positionScaleZ;
                        t2[2] = -position[i2 + 2] * positionScaleZ;
                    }

                    const intersectRayLength = Raycaster.rayIntersectsTriangle(rayOrigin, rayDirection, t0, t1, t2);

                    if (intersectRayLength) {
                        if (intersectRayLength < result.z) {
                            bufferIndex = m;
                            // bufferIndex = Math.max(i0, i1, i2);
                            result.z = intersectRayLength;
                        }
                    }
                }
            }
        }

        if (bufferIndex != null) {
            for (let i = 0, {idOffsets} = buffer, {length} = idOffsets; i < length; i += 2) {
                if (bufferIndex < idOffsets[i]) {
                    return idOffsets[i + 1];
                }
            }
        }
    }

    generateWireframeIndices(): Uint16Array | Uint32Array {
        const triangleIndices: ArrayLike<number> = this.index();
        const edgeSet = new Set<string>();
        const lines: number[] = [];

        for (let i = 0; i < triangleIndices.length; i += 3) {
            const i0 = triangleIndices[i];
            const i1 = triangleIndices[i + 1];
            const i2 = triangleIndices[i + 2];

            const edges: [number, number][] = [
                [i0, i1],
                [i1, i2],
                [i2, i0]
            ];

            for (const [a, b] of edges) {
                const key = a < b ? `${a};${b}` : `${b};${a}`;
                if (!edgeSet.has(key)) {
                    edgeSet.add(key);
                    lines.push(a, b);
                }
            }
        }

        const IndexArrayConstructor =
            triangleIndices instanceof Uint32Array ? Uint32Array : Uint16Array;

        return new IndexArrayConstructor(lines);
    }
}
