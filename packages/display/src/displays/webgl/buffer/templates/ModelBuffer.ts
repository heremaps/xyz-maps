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

import {scale, rotate, multiply, identity, translate, create} from 'gl-matrix/mat4';
import {transformMat4} from 'gl-matrix/vec3';
import {isTypedArray, TypedArray} from '../glType';
import {Attribute} from '../Attribute';
import {toRGB} from '../../color';


enum HitTest {
    bbox,
    geometry
}

const NO_COLOR_WHITE = [1, 1, 1, 1];

export type GeometryData = {
    position: TypedArray | number[],
    index?: number[],
    normal?: TypedArray | number[],
    texcoord?: number[],
    color?: string | [number, number, number, number]
};

export class ModelBuffer extends TemplateBuffer {
    destroy?: (buffer: GeometryBuffer) => void;

    static calcBBox(data: GeometryData) {
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

    static init(attributes, data: GeometryData) {
        if (data) {
            const {position, normal, color, texcoord} = data;
            let colorRGB: Uint8Array | number[] | string = NO_COLOR_WHITE;
            let size;

            attributes.a_position = {
                data: ModelBuffer.createFlexArray(position),
                size: 3
            };

            if (normal) {
                attributes.a_normal = {
                    data: ModelBuffer.createFlexArray(normal),
                    size: 3
                    // normalized: true
                };
            }

            if (texcoord) {
                attributes.a_texcoord = {
                    data: ModelBuffer.createFlexArray(texcoord),
                    size: 2
                };
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
    };

    static createFlexArray(array: TypedArray | number[]) {
        return new FlexArray(isTypedArray(array) ? <TypedArray>array : new Float32Array(array));
    }


    flexAttributes: {
        a_position?: FlexAttribute,
        a_modelMatrix?: FlexAttribute,
        a_offset?: FlexAttribute,
        a_color?: FlexAttribute | ConstantAttribute,
        a_texcoord?: FlexAttribute
        a_normal?: FlexAttribute
    };


    hitTest: HitTest = HitTest.bbox;
    id: string | number;
    bbox: number[];

    constructor(geometryData?: GeometryData, material?, modelMatrix?, offset?) {
        super(false);

        this.flexAttributes = {};

        const {flexAttributes} = this;

        ModelBuffer.init(flexAttributes, geometryData);

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
    }


    private setOptional(attributes, data: GeometryData) {
        const {position, normal, index, color, texcoord} = data;

        let colorRGB: Uint8Array | number[] | string = NO_COLOR_WHITE;
        let size;

        if (normal) {
            attributes.a_normal = {
                data: ModelBuffer.createFlexArray(normal),
                size: 3
                // normalized: true
            };
        }

        if (texcoord) {
            attributes.a_texcoord = {
                data: ModelBuffer.createFlexArray(texcoord),
                size: 2
            };
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

    addInstance(x: number, y: number, z: number, scaleXYZ?: number[], translateXYZ?: number[], rotation?: number[], transform?) {
        this.instances++;

        // var m = create();
        var m = new Float64Array(16);
        identity(m);

        // translate(m, m, [0.5309507019668391, 0.34998539151450736, 0]);
        // translate(m, m, [x, y, z]);
        // debugger;
        if (transform) {
            multiply(m, m, transform);

            // translate(m, m, [x, y, z]);
        } else {
            // identity(m);
            // rotate(m, m, 90/180*Math.PI, [0, 0, 1]);
            // translate(m, m, [x, y, z]);


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

    rayIntersects(buffer: GeometryBuffer, result: { z: number }, tileX: number, tileY: number, rayCaster: Raycaster): number | string {
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

                const groundRes = <number>buffer.uniforms.u_groundResolution || (1 / rayCaster.scaleZ);

                for (let p of box) {
                    // p[0] /= groundRes;
                    // p[1] /= groundRes;
                    // p[2] /= groundRes;
                    // transformMat4(p, p, modelMatrix);
                    // p[0] += tileX;
                    // p[1] += tileY;
                    // p[2] *= -groundRes;
                    transformMat4(p, p, modelMatrix);

                    p[0] = p[0]/groundRes + tileX + positionOffsetData[i];
                    p[1] = p[1]/groundRes + tileY + positionOffsetData[i + 1];
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
}
