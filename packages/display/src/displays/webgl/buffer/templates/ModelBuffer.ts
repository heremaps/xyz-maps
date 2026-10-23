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
import {FlexAttribute, TemplateBuffer} from './TemplateBuffer';
import {GeometryBuffer, ElementsDrawCmd, ArrayDrawCmd} from '../GeometryBuffer';
import {Raycaster} from '../../Raycaster';
import {multiply, create as createMat4, fromRotationTranslationScale, invert} from 'gl-matrix/mat4';
import {normalFromMat4, create as createMat3} from 'gl-matrix/mat3';
import {subtract, scale as scaleVec3, normalize as normalizeVec3, transformMat4} from 'gl-matrix/vec3';
import {create as createQuat, fromEuler} from 'gl-matrix/quat';
import {isTypedArray, type TypedArray} from '../glType';
import {Attribute, ConstantAttribute} from '../Attribute';
import {Color} from '@here/xyz-maps-common';
import {ModelGeometry, ModelData} from '@here/xyz-maps-core';

import toRGB = Color.toRGB;
import {measureStart, measureEnd} from '../../PerfTimer';

const NO_COLOR_WHITE = [1, 1, 1, 1];
const TO_DEG = 180 / Math.PI;

type VertexData = TypedArray | number[];

type BBoxRayScratch = {
    inverseModelMatrix: Float32Array;
    origin: number[];
    direction: number[];
};

type ModelVertexTransformCoefficients = {
    x0: number;
    x1: number;
    x2: number;
    xOffset: number;
    y0: number;
    y1: number;
    y2: number;
    yOffset: number;
    z0: number;
    z1: number;
    z2: number;
    zOffset: number;
};

const MODEL_BBOX_LINE_INDICES = [
    0, 1, 1, 3, 3, 2, 2, 0,
    4, 5, 5, 7, 7, 6, 6, 4,
    0, 4, 1, 5, 2, 6, 3, 7
];

export const addModelWireframeDebugDraw = (
    geoBuffer: GeometryBuffer,
    templateBuffer: TemplateBuffer,
    color: true | number[]
): void => {
    const indices = templateBuffer.hasIndex()
        ? GeometryBuffer.generateWireframeIndices(templateBuffer.index())
        : GeometryBuffer.generateWireframeIndices(templateBuffer.first, templateBuffer.count());
    const wireframe = geoBuffer.addDrawCmd(
        indices,
        indices instanceof Uint32Array,
        GeometryBuffer.MODE_GL_LINES
    );
    wireframe.uniforms = {
        diffuse: [0, 0, 0],
        emissive: color === true
            ? (geoBuffer.getUniform('diffuse') as number[]).slice(0, 3).map((c) => 1 - c)
            : color,
        alphaCutoff: 0,
        opacity: 1
    };
};

export const addModelBBoxDebugDraw = (geoBuffer: GeometryBuffer, color: number[]) => {
    const bbox = geoBuffer.bbox;
    if (!bbox || bbox.length < 6) {
        return;
    }

    const positions = new Float32Array([
        bbox[0], bbox[1], bbox[2],
        bbox[3], bbox[1], bbox[2],
        bbox[0], bbox[4], bbox[2],
        bbox[3], bbox[4], bbox[2],
        bbox[0], bbox[1], bbox[5],
        bbox[3], bbox[1], bbox[5],
        bbox[0], bbox[4], bbox[5],
        bbox[3], bbox[4], bbox[5]
    ]);
    const bboxLines = geoBuffer.addDrawCmd(
        MODEL_BBOX_LINE_INDICES,
        false,
        GeometryBuffer.MODE_GL_LINES
    );

    geoBuffer.addGroupAttribute(bboxLines, 'a_position', {data: positions, size: 3});
    geoBuffer.addGroupAttribute(bboxLines, 'a_normal', {value: [0, 0, 1]});
    geoBuffer.addGroupAttribute(bboxLines, 'a_tangent', {value: [1, 0, 0]});
    geoBuffer.addGroupAttribute(bboxLines, 'a_color', {value: [1, 1, 1, 1]});
    geoBuffer.addGroupAttribute(bboxLines, 'a_uv', {value: [0, 0]});

    bboxLines.uniforms = {
        diffuse: [0, 0, 0],
        emissive: color,
        alphaCutoff: 0,
        opacity: 1
    };
};

function transformModelVertex(
    target: number[],
    position: ArrayLike<number>,
    vertexIndex: number,
    size: number,
    coefficients: ModelVertexTransformCoefficients
): void {
    const x = position[vertexIndex];
    const y = position[vertexIndex + 1];
    const z = size > 2 ? position[vertexIndex + 2] : 0;
    target[0] = x * coefficients.x0 + y * coefficients.x1 + z * coefficients.x2 + coefficients.xOffset;
    target[1] = x * coefficients.y0 + y * coefficients.y1 + z * coefficients.y2 + coefficients.yOffset;
    target[2] = x * coefficients.z0 + y * coefficients.z1 + z * coefficients.z2 + coefficients.zOffset;

    // Equivalent reference implementation for affine model matrices:
    // Using the modelMatrix, xyUnitScale, tile, offset and exaggeration used to compute the coefficients:
    // target[0] = position[vertexIndex];
    // target[1] = position[vertexIndex + 1];
    // target[2] = size > 2 ? position[vertexIndex + 2] : 0;
    // transformMat4(target, target, modelMatrix);
    // target[0] = tileX + target[0] * xyUnitScale + offsetX;
    // target[1] = tileY + target[1] * xyUnitScale + offsetY;
    // target[2] += offsetZ * exaggeration;
}

function updateModelVertexTransformCoefficients(
    coefficients: ModelVertexTransformCoefficients,
    modelMatrix: Float32Array,
    xyUnitScale: number,
    tileX: number,
    tileY: number,
    offsetX: number,
    offsetY: number,
    offsetZ: number,
    exaggeration: number
): void {
    coefficients.x0 = modelMatrix[0] * xyUnitScale;
    coefficients.x1 = modelMatrix[4] * xyUnitScale;
    coefficients.x2 = modelMatrix[8] * xyUnitScale;
    coefficients.xOffset = modelMatrix[12] * xyUnitScale + tileX + offsetX;
    coefficients.y0 = modelMatrix[1] * xyUnitScale;
    coefficients.y1 = modelMatrix[5] * xyUnitScale;
    coefficients.y2 = modelMatrix[9] * xyUnitScale;
    coefficients.yOffset = modelMatrix[13] * xyUnitScale + tileY + offsetY;
    coefficients.z0 = modelMatrix[2];
    coefficients.z1 = modelMatrix[6];
    coefficients.z2 = modelMatrix[10];
    coefficients.zOffset = modelMatrix[14] + offsetZ * exaggeration;
}

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
    }
    ;

    return tangents;
}

export class ModelBuffer extends TemplateBuffer {
    isPointBuffer = true;
    destroy?: (buffer: GeometryBuffer) => void;
    private defaultOrientationMatrix: Float32Array = new Float32Array([1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1]);
    // Flip Y and rotate by 90 degrees along the X-axis (pitch rotation).
    // private defaultOrientationMatrix: number[] = [1, 0, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 1];

    static calcBBox(geometry: ModelGeometry) {
        const {position} = geometry;
        let size = geometry.size ?? 3;
        let minX = Infinity;
        let maxX = -minX;
        let minY = minX;
        let maxY = maxX;
        let minZ = minX;
        let maxZ = maxX;

        // console.time('calcModelBBox');
        if (size == 3) {
            for (let i = 0, {length} = position; i < length; i += size) {
                const x = position[i];
                const y = position[i + 1];
                const z = position[i + 2];
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                if (z < minZ) minZ = z;
                if (z > maxZ) maxZ = z;
            }
        } else {
            minZ = 0;
            maxZ = 0;
            for (let i = 0, {length} = position; i < length; i += size) {
                const x = position[i];
                const y = position[i + 1];
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
        // console.timeEnd('calcModelBBox');
        return [minX, minY, minZ, maxX, maxY, maxZ];
    }

    static init(data: ModelGeometry & {
        // Set `normal` to `false` to disable automatic normal vector calculation.
        normal?: TypedArray | number[] | false
    }, attributes: ModelBuffer['flexAttributes'] = {}) {
        if (data) {
            const {position, color, uv} = data;
            let colorRGB: Uint8Array | number[] | string = NO_COLOR_WHITE;
            let vertexSize = data.size ?? 3;
            let size;

            attributes.a_position = {
                data: ModelBuffer.createFlexArray(position),
                size: vertexSize
            };

            const normal = data.normal ??= GeometryBuffer.computeNormals(position, data.index);
            if (normal) {
                attributes.a_normal = {
                    data: ModelBuffer.createFlexArray(normal),
                    size: vertexSize,
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
    id: string | number;
    bbox: number[];

    fragmentTileClip: boolean = false;

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

    addInstance(
        x: number,
        y: number,
        z: number,
        scaleXYZ: number[] = [1, 1, 1],
        translateXYZ: number[] = [0, 0, 0],
        rotation: number[] = [0, 0, 0],
        transform?: ArrayLike<number>
    ) {
        this.instances++;
        this.flexAttributes.a_offset.data.push(x, y, z);

        // scale → rotate → translate
        let rotationQuat = fromEuler(createQuat(), rotation[0] * TO_DEG, rotation[1] * TO_DEG, rotation[2] * TO_DEG);
        let modelMatrix = fromRotationTranslationScale(
            createMat4(),
            rotationQuat,
            translateXYZ,
            scaleXYZ
        );
        const mm = this.defaultOrientationMatrix.slice();
        modelMatrix = multiply(mm, mm, modelMatrix);

        // this.uniforms.u_normalMatrix = transpose(modelMatrix, invert(modelMatrix, modelMatrix));
        // this.uniforms.u_normalMatrix = normalFromMat4(createMat3(), modelMatrix);
        // create normal matrix to support non-uniform coordinate systems
        const normalMatrix = createMat3();
        this.uniforms.u_normalMatrix = normalFromMat4(normalMatrix, modelMatrix) || normalMatrix;

        const flexArray = this.flexAttributes.a_modelMatrix.data;
        flexArray.set(modelMatrix, flexArray.length);
    }

    setIdOffset(featureId: string) {
        this.idOffsets?.push(this.flexAttributes.a_modelMatrix.data.length, featureId);
    }

    private static rayIntersectsBBox(
        buffer: GeometryBuffer,
        modelMatrix: Float32Array,
        positionOffsetData: ArrayLike<number>,
        offsetIndex: number,
        xyUnitScale: number,
        tileX: number,
        tileY: number,
        rayCaster: Raycaster,
        scratch: BBoxRayScratch
    ): number | null {
        const bbox = buffer.bbox;
        if (!bbox) {
            return null;
        }

        const {inverseModelMatrix, origin, direction} = scratch;
        const groundRes = 1 / xyUnitScale;

        // Singular transforms (e.g. zero scale on an axis) cannot map the ray into model space.
        if (!invert(inverseModelMatrix, modelMatrix)) {
            return null;
        }

        const rayOrigin = rayCaster.origin;
        const rayDirection = rayCaster.direction;
        origin[0] = (rayOrigin[0] - tileX - positionOffsetData[offsetIndex]) * groundRes;
        origin[1] = (rayOrigin[1] - tileY - positionOffsetData[offsetIndex + 1]) * groundRes;
        origin[2] = rayOrigin[2] - positionOffsetData[offsetIndex + 2] * rayCaster.exaggeration;
        // gl-matrix equivalent:
        // subtract(origin, rayOrigin, [tileX + positionOffsetData[offsetIndex],tileY + positionOffsetData[offsetIndex + 1],positionOffsetData[offsetIndex + 2] * rayCaster.exaggeration]);
        // multiply(origin, origin, [groundRes, groundRes, 1]);
        transformMat4(origin, origin, inverseModelMatrix);

        const dx = rayDirection[0] * groundRes;
        const dy = rayDirection[1] * groundRes;
        const dz = rayDirection[2];
        direction[0] = inverseModelMatrix[0] * dx + inverseModelMatrix[4] * dy + inverseModelMatrix[8] * dz;
        direction[1] = inverseModelMatrix[1] * dx + inverseModelMatrix[5] * dy + inverseModelMatrix[9] * dz;
        direction[2] = inverseModelMatrix[2] * dx + inverseModelMatrix[6] * dy + inverseModelMatrix[10] * dz;

        let tNear = -Infinity;
        let tFar = Infinity;
        for (let axis = 0; axis < 3; axis++) {
            const rayDirectionComponent = direction[axis];
            const rayOriginComponent = origin[axis];
            const boxMin = bbox[axis];
            const boxMax = bbox[axis + 3];

            if (rayDirectionComponent == 0) {
                if (rayOriginComponent < boxMin || rayOriginComponent > boxMax) {
                    return null;
                }
                continue;
            }
            let t1 = (boxMin - rayOriginComponent) / rayDirectionComponent;
            let t2 = (boxMax - rayOriginComponent) / rayDirectionComponent;
            if (t1 > t2) {
                const tmp = t1;
                t1 = t2;
                t2 = tmp;
            }
            tNear = Math.max(tNear, t1);
            tFar = Math.min(tFar, t2);
            if (tNear > tFar) {
                return null;
            }
        }
        return tFar < 0
            ? null
            : tNear < 0 ? tFar : tNear;
    }

    private static xyUnitScaleFor(buffer: GeometryBuffer, rayCaster: Raycaster): number {
        if (buffer.uniforms.u_isPixelCoords) {
            return 1;
        }
        const zMeterToPixelUniform = <number>buffer.uniforms.u_zMeterToPixel;
        // GLRender divides its shared u_zMeterToPixel by dZoom. the ray is already tile-local.
        return zMeterToPixelUniform || rayCaster.scaleZ / rayCaster.tileScale;
    }

    static getInstanceHeightBounds(buffer: GeometryBuffer, exaggeration: number): number[] | null {
        const bbox = buffer.bbox;
        if (!bbox) return null;
        // Finalized model instance transforms are immutable. only exaggeration changes their height bounds.
        const cached = buffer.instanceHeightBounds;
        if (cached?.[2] === exaggeration) {
            return cached[0] <= cached[1] ? cached : null;
        }

        const matrices = (buffer.attributes.a_modelMatrix as Attribute).data as Float32Array;
        const offsets = (buffer.attributes.a_offset as Attribute).data;
        const coefficients = {} as ModelVertexTransformCoefficients;
        const point = [0, 0, 0];
        const corner = [0, 0, 0];
        let min = Infinity;
        let max = -Infinity;
        for (let m = 0, i = 0; m < matrices.length; m += 16, i += 3) {
            updateModelVertexTransformCoefficients(
                coefficients, matrices.subarray(m, m + 16), 1, 0, 0,
                offsets[i], offsets[i + 1], offsets[i + 2], exaggeration
            );
            for (let c = 0; c < 8; c++) {
                corner[0] = bbox[c & 1 ? 3 : 0];
                corner[1] = bbox[c & 2 ? 4 : 1];
                corner[2] = bbox[c & 4 ? 5 : 2];
                transformModelVertex(point, corner, 0, 3, coefficients);
                min = Math.min(min, point[2]);
                max = Math.max(max, point[2]);
            }
        }
        const bounds = buffer.instanceHeightBounds;
        if (bounds) {
            bounds[0] = min;
            bounds[1] = max;
            bounds[2] = exaggeration;
        } else {
            buffer.instanceHeightBounds = [min, max, exaggeration];
        }
        return min <= max ? buffer.instanceHeightBounds : null;
    }

    rayIntersects(
        buffer: GeometryBuffer,
        result: {
            z: number
        },
        tileX: number,
        tileY: number,
        rayCaster: Raycaster
    ): number | string {
        // measureStart('rayIntersect');
        const {attributes} = buffer;
        const positionAttr = attributes.a_position as Attribute;
        const modelMatrixData = (attributes.a_modelMatrix as Attribute).data as Float32Array;
        const positionOffsetData = (attributes.a_offset as Attribute).data;
        const clipBounds = rayCaster.tileClipBounds;
        const position = positionAttr.data;
        const size = positionAttr.size;
        const rayOrigin = rayCaster.origin;
        const rayDirection = rayCaster.direction;
        const xyUnitScale = ModelBuffer.xyUnitScaleFor(buffer, rayCaster);
        const t0 = [0, 0, 0];
        const t1 = [0, 0, 0];
        const t2 = [0, 0, 0];
        let bufferIndex = null;
        const bbox = buffer.bbox;

        const bboxScratch: BBoxRayScratch | undefined = bbox ? {
            inverseModelMatrix: createMat4(),
            origin: [0, 0, 0],
            direction: [0, 0, 0]
        } : undefined;

        let coefficients: ModelVertexTransformCoefficients | undefined;

        for (let m = 0, i = 0, {length} = modelMatrixData; m < length; m += 16, i += 3) {
            const modelMatrix = modelMatrixData.subarray(m, m + 16);


            if (bboxScratch) {
                const intersectRayLength = ModelBuffer.rayIntersectsBBox(
                    buffer,
                    modelMatrix,
                    positionOffsetData,
                    i,
                    xyUnitScale,
                    tileX,
                    tileY,
                    rayCaster,
                    bboxScratch
                );

                if (intersectRayLength == null) continue;
            }

            coefficients ||= {
                x0: 0, x1: 0, x2: 0, xOffset: 0,
                y0: 0, y1: 0, y2: 0, yOffset: 0,
                z0: 0, z1: 0, z2: 0, zOffset: 0
            };
            // Precompute the combined affine transform once per mesh-tested instance and reuse it for every vertex.
            updateModelVertexTransformCoefficients(
                coefficients, modelMatrix, xyUnitScale, tileX, tileY,
                positionOffsetData[i], positionOffsetData[i + 1], positionOffsetData[i + 2],
                rayCaster.exaggeration
            );

            for (let group of buffer.groups) {
                const indexData = (<ElementsDrawCmd>group).index?.data;
                const first = indexData ? 0 : (<ArrayDrawCmd>group).arrays.first;
                const count = indexData ? indexData.length : (<ArrayDrawCmd>group).arrays.count;

                if (group.mode == GeometryBuffer.MODE_GL_LINES) continue;

                for (let i = 0; i + 2 < count; i += 3) {
                    const i0 = (indexData ? indexData[i] : first + i) * size;
                    const i1 = (indexData ? indexData[i + 1] : first + i + 1) * size;
                    const i2 = (indexData ? indexData[i + 2] : first + i + 2) * size;

                    transformModelVertex(t0, position, i0, size, coefficients);
                    transformModelVertex(t1, position, i1, size, coefficients);
                    transformModelVertex(t2, position, i2, size, coefficients);

                    const intersectRayLength = Raycaster.rayIntersectsTriangle(rayOrigin, rayDirection, t0, t1, t2);

                    if (intersectRayLength) {
                        if (clipBounds) {
                            const x = rayOrigin[0] + rayDirection[0] * intersectRayLength - tileX;
                            const y = rayOrigin[1] + rayDirection[1] * intersectRayLength - tileY;
                            if (x < clipBounds[0] || y < clipBounds[1] || x >= clipBounds[2] || y >= clipBounds[3]) {
                                continue;
                            }
                        }
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
