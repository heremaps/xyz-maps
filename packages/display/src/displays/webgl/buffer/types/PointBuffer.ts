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

import {BufferStyle, FlexAttribute, GeometryBuffer} from '../GeometryBuffer';
import type {BufferUniforms, BufferAttributes, ConfigureBufferStyle} from '../GeometryBuffer';
import type {PaintBufferStyle, ResolvedBufferStyle} from '../BufferStyle';
import {FlexArray} from '../FlexArray';

import {Raycaster} from '../../Raycaster';
import {transformMat4} from 'gl-matrix/vec3';
import {Attribute} from '../Attribute';
import {vec3, Expression} from '@here/xyz-maps-common';
import {addPoint} from '../geometry/addPoint';
import {PASS} from '../../RenderPass';
import {getUnitBatchKey, getOffsetUnitFlags, packOffsets, encodeBatchValue, OFFSET_CUSTOM_UNITS, OFFSET_TEXT, OFFSET_PACKED} from '../batchKey';

const extentScale = 32;
const PAINT_POINTER_EVENTS = 1;
const PAINT_MAP_ALIGNED = 2;
const PAINT_VIEWPORT_ALIGNED = 4;
const PAINT_CUSTOM_ALIGNMENT = 8;
const PAINT_STROKE = 16;
const PAINT_WIDTH = 32;
const PAINT_FILL = 64;
const PAINT_STRING_WIDTH = 128;

export function getPointBatchKey(
    strokeIdentity: string, width: number | string, fillIdentity: string, pointerEvents: boolean, alignment: string,
    x: number, y: number, z: number, unitX: string, unitY: string, unitZ: string, prefix: string = '', geometryKey: string = ''
): string {
    const strokeKey = strokeIdentity || '';
    const fillKey = fillIdentity || '';
    const alignmentFlag = !alignment ? 0 : alignment === 'map' ? PAINT_MAP_ALIGNED
        : alignment === 'viewport' ? PAINT_VIEWPORT_ALIGNED : PAINT_CUSTOM_ALIGNMENT;
    const hasWidth = width !== undefined && width !== null;
    const stringWidth = typeof width === 'string';
    const packed = packOffsets(x, y, z);
    const flags = (pointerEvents ? PAINT_POINTER_EVENTS : 0) | alignmentFlag |
        (strokeKey ? PAINT_STROKE : 0) | (hasWidth ? PAINT_WIDTH : 0) |
        (fillKey ? PAINT_FILL : 0) | (stringWidth ? PAINT_STRING_WIDTH : 0) |
        getOffsetUnitFlags(unitX, unitY, unitZ) | (packed === undefined ? OFFSET_TEXT : packed !== 0 ? OFFSET_PACKED : 0);
    let key = prefix + 'P' + flags;
    if (alignmentFlag === PAINT_CUSTOM_ALIGNMENT) key += ':' + encodeBatchValue(alignment);
    if (hasWidth) key += ':' + (stringWidth ? width.length + ':' + width : width);
    if (strokeKey) key += ':' + strokeKey.length + ':' + strokeKey;
    if (fillKey) key += ':' + fillKey.length + ':' + fillKey;
    if (packed !== 0) key += packed !== undefined ? ':' + packed : ':' + x + ':' + y + ':' + z;
    if (flags & OFFSET_CUSTOM_UNITS) key += ':' + encodeBatchValue(unitX) + encodeBatchValue(unitY) + encodeBatchValue(unitZ);
    return key + geometryKey;
}

const toPixel = (value: number, meterToPixel: number, renderScale: number): number => {
    return meterToPixel > 0 ? value * meterToPixel * renderScale : value;
};

export const decodeUint16z = (z: number): number => {
    return z * 9000 / 0xffff;
};

export const getOffsetPixel = (buffer: GeometryBuffer, scale: number, scaleZ?: number) => {
    const uOffset = <number[]>buffer.getUniform('u_offset');
    const offsetX = toPixel(uOffset[0], uOffset[1], scale);
    const offsetY = toPixel(uOffset[2], uOffset[3], scale);

    const uOffsetZ = <number[]>buffer.getUniform('u_offsetZ');
    const offsetZ = toPixel(uOffsetZ[0], uOffsetZ[1], scale);

    // if (offsetZUnit) {
    //     // value is defined in meters -> convert to pixels at current zoom
    //     offsetZ *= scale * offsetZUnit;
    // }
    // return [offsetX, offsetY, offsetZ / scaleZ / scale];
    return [offsetX, offsetY, offsetZ];
};


export type PointBufferStyle = ResolvedBufferStyle<'fill' | 'fillIntensity' | 'stroke' | 'strokeWidth' | 'width' | 'height' | 'unit' | 'rotation'>;

export type PointBufferUniforms = BufferUniforms & {
    'u_normalizePosition'?: number;
    'u_fill'?: number[] | Float32Array;
    'u_fillIntensity'?: number;
    'u_stroke'?: number[] | Float32Array;
    'u_strokeWidth'?: number;
    'u_radius'?: (number | Expression)[];
    'u_size'?: (number | Expression)[];
    'u_rotation'?: number;
};

export class PointBuffer extends GeometryBuffer {
    static getCircleGeometryKey(altitude: BufferStyle['altitude'], unit: string, radius: number | Expression): string {
        return (altitude ? 'AC' : 'C') + getUnitBatchKey(unit) + ':' + this.getSizeBatchKey(radius);
    }

    static getRectangleGeometryKey(altitude: BufferStyle['altitude'], rotation: number, unit: string, width: number, height: number): string {
        return (altitude ? 'AR' : 'R') + rotation + ':' + getUnitBatchKey(unit) + ':' + width + ':' + height;
    }

    static getPointBatchKey = getPointBatchKey;

    isPointGeometry = true;
    anchoredPixelSize = true;

    flexAttributes: {
        'a_position': FlexAttribute
    } | null;

    declare uniforms: PointBufferUniforms;
    declare attributes: GeometryBuffer['attributes'] & BufferAttributes<NonNullable<PointBuffer['flexAttributes']>>;
    declare configureStyle: ConfigureBufferStyle<PointBufferStyle>;

    protected normalizePosition: number;

    constructor(flat: boolean = true, tileSize?: number) {
        super(flat);

        this.flexAttributes = {
            // vertex
            a_position: {
                data: new FlexArray(Uint16Array),
                size: flat ? 2 : 3,
                // Marked as dynamic since collision detection may modify LSB of the x component to indicate visibility
                dynamic: true
            }
        };

        if (tileSize) {
            // 14-bit position precision
            this.normalizePosition = 16384 / tileSize;

            this.addUniform('u_normalizePosition', 1 / this.normalizePosition);
        }


        this.first = 0;
        // this.first = this.flexAttributes.a_position.data.length / this.flexAttributes.a_position.data.size;
    }

    addPoint(x: number, y: number, z: number, hide?: boolean) {
        this.assertConstructing();
        addPoint(x, y, z, this.normalizePosition, this.flexAttributes.a_position.data);
    }

    protected configurePointColors(style: PaintBufferStyle, hasAlphaColor: boolean) {
        const fill = GeometryBuffer.getFillColor(style.fill) || PointBuffer.COLOR_UNDEFINED;
        this.addUniform('u_fill', fill);
        this.addUniform('u_fillIntensity', style.fillIntensity);
        let strokeWidth = style.strokeWidth;
        if (style.stroke) {
            this.addUniform('u_stroke', style.stroke);
            strokeWidth ??= 1;
        }
        this.addUniform('u_strokeWidth', typeof strokeWidth === 'number' ? strokeWidth ^ 0 : 0);
        if (hasAlphaColor) {
            this.pass = PASS.ALPHA_COLOR;
            this.depth = this.blend = true;
        }
        return fill;
    }

    protected configureTypeStyle(style: PointBufferStyle, meterToPixel: number, hasAlphaColor: boolean): void {
        const fill = this.configurePointColors(style, hasAlphaColor);
        const toPixel = style.unit === 'm' ? meterToPixel : 0;
        if (this.type === 'Circle') {
            this.addUniform('u_radius', [style.width, toPixel]);
        } else {
            if (fill === PointBuffer.COLOR_UNDEFINED) {
                this.pass = PASS.ALPHA_COLOR;
                this.blend = true;
            }
            this.addUniform('u_size', [style.width, toPixel, style.height, toPixel]);
            this.addUniform('u_rotation', style.rotation * (Math.PI / 180));
        }
        this.addUniform('u_alignMap', style.alignment === 'map');
    }

    rayIntersects(buffer: GeometryBuffer, result: { z: number }, tileX: number, tileY: number, rayCaster: Raycaster): number | string {
        const {type, attributes} = buffer;
        const alignMap = <boolean>buffer.getUniform('u_alignMap');
        const scaleByAltitude = <boolean>buffer.getUniform('u_scaleByAltitude');
        const {scaleZ} = rayCaster;

        // const invRenderScale = 1 / buffer.renderScale;
        let scaleXYZ = alignMap
            ? rayCaster.getInverseWorldScale(buffer.renderScale) // world scale
            // : [1 / buffer.renderScale, 1 / buffer.renderScale, 1]; // screen scale
            : [1, 1, 1]; // screen scale

        const invMapScale = alignMap ? 1 / buffer.renderScale : 1;
        let width;
        let height;
        let [offsetX, offsetY, offsetZ] = getOffsetPixel(buffer, buffer.renderScale);

        offsetX *= scaleXYZ[0];
        offsetY *= scaleXYZ[1];
        // Convert the pixel offset to meters, matching the shader's height conversion for both alignments.
        offsetZ *= rayCaster.tileScale / (scaleZ * buffer.renderScale);

        if (type === 'Rect') {
            const size = <number[]>buffer.getUniform('u_size');
            const strokeWidth = <number>buffer.getUniform('u_strokeWidth') || 0;
            width = (toPixel(size[0], size[1], buffer.renderScale) + strokeWidth) * .5;
            height = (toPixel(size[2], size[3], buffer.renderScale) + strokeWidth) * .5;
        } else if (type == 'Circle') {
            const radius = <number[]>buffer.getUniform('u_radius');
            const strokeWidth = <number>buffer.getUniform('u_strokeWidth') || 0;
            width = height = toPixel(radius[0], radius[1], buffer.renderScale) + strokeWidth * .5;
        }

        width *= scaleXYZ[0];
        height *= scaleXYZ[1];

        const positionAttribute = (attributes.a_position as Attribute);
        const position = positionAttribute.data;
        const size = positionAttribute.size;
        const t0 = [0, 0, 0];
        const t1 = [0, 0, 0];
        let intersectionPoint;
        let rayOrigin;
        let rayDirection;
        let screenMatrix;
        let bufferIndex = null;
        let renderScale = 1;

        if (alignMap) {
            rayOrigin = rayCaster.origin;
            rayDirection = rayCaster.direction;
        } else {
            intersectionPoint = [0, 0, 0];
            screenMatrix = rayCaster.sMat;
            renderScale = rayCaster.tileScale;
            rayOrigin = rayCaster.sOrigin;
            rayDirection = rayCaster.sDirection;
        }
        const referenceW = buffer.referenceW;

        const stride = 6 * size;
        const heightMap = buffer.getHeightMap();
        const hmTransform = buffer.getHeightMapTransform() || [0, 0, 1];

        for (let i = 0, y = 0; i < position.length; i += stride, y += 6) {
            const tileLocalX = (position[i] >> 2) / extentScale;
            const tileLocalY = (position[i + 1] >> 2) / extentScale;
            const x0 = tileX + tileLocalX * renderScale;
            const y0 = tileY + tileLocalY * renderScale;
            // convert normalized int16 to float meters (-500m ... +9000m)
            // z0 = (z0 - 32267.0) * 0.14496292001098665;
            const z0 = (heightMap
                ? PointBuffer.getVertexZ(tileLocalX, tileLocalY, heightMap, hmTransform)
                : (size === 2 ? 0 : decodeUint16z(position[i + 2]))
            ) * rayCaster.exaggeration;

            let dx0 = (position[i] & 2) - 1;
            let dy0 = (position[i + 1] & 2) - 1;

            let j = i + 2 * size;
            let dx1 = (position[j] & 2) - 1;
            let dy1 = (position[j + 1] & 2) - 1;

            if (type === 'Icon') {
                let point = (attributes.a_size as Attribute)?.data;
                width = point[y] * .5 * invMapScale;
                height = point[y + 1] * .5 * invMapScale;
            }

            if (alignMap) {
                // Position tile-local feature center. only the sizing anchor is transformed to world.
                t0[0] = t1[0] = x0 + offsetX;
                t0[1] = t1[1] = y0 + offsetY;
                t0[2] = t1[2] = z0 + offsetZ;

                const scaleDZ = rayCaster.getLocalAltitudeScale(t0[0], t0[1], t0[2], scaleByAltitude, referenceW);
                const w = width * scaleDZ;
                const h = height * scaleDZ;

                t0[0] += dx0 * w;
                t0[1] -= dy0 * h;

                t1[0] += dx1 * w;
                t1[1] -= dy1 * h;
            } else {
                t0[0] = x0;
                t0[1] = y0;
                t0[2] = z0 + offsetZ;

                // transformMat4(t0, t0, rayCaster.sMat);
                // t1[0] = t0[0] + dx1 * width;
                // t1[1] = t0[1] - dy1 * height;
                // t1[2] = t0[2];
                //
                // t2[0] = t0[0] + dx2 * width;
                // t2[1] = t0[1] - dy2 * height;
                // t2[2] = t0[2];
                //
                // t0[0] += dx0 * width;
                // t0[1] -= dy0 * height;
                //
                // transformMat4(t0, t0, rayCaster.iSMat);
                // transformMat4(t1, t1, rayCaster.iSMat);
                // transformMat4(t2, t2, rayCaster.iSMat);
                // rayOrigin = rayCaster.origin;
                // rayDirection = rayCaster.direction;

                transformMat4(t0, t0, screenMatrix);

                t0[0] += offsetX;
                t0[1] += offsetY;

                t1[0] = t0[0] + dx1 * width;
                t1[1] = t0[1] - dy1 * height;
                t1[2] = t0[2];

                t0[0] += dx0 * width;
                t0[1] -= dy0 * height;
            }

            let intersectRayLength = rayCaster.intersectAABBox(
                t0[0], t0[1], t0[2],
                t1[0], t1[1], t1[2],
                rayOrigin,
                rayDirection
            );
            // the terrain-overlay path intentionally renders the whole
            // symbol from its anchor depth, not from the terrain at each pointer pixel.
            const canPickOverTerrain = rayCaster.canPickOverTerrain(buffer);

            if (intersectRayLength) {
                if (!alignMap) {
                    vec3.add(intersectionPoint, rayOrigin, vec3.scale(intersectionPoint, rayDirection, intersectRayLength));
                    intersectRayLength = rayCaster.rayLengthScreenToWorld(intersectionPoint);
                }

                if (intersectRayLength < result.z || canPickOverTerrain) {
                    result.z = intersectRayLength;
                    bufferIndex = i;
                }
            }
        }

        if (bufferIndex != null) {
            return buffer.idOffsets[Math.floor(bufferIndex / stride)];
        }
    }
}
