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

import {add, cross, dot, normalize, scale, subtract, transformMat4} from 'gl-matrix/vec3';
import {GeometryBuffer} from './buffer/GeometryBuffer';

export type Vec3 = [number, number, number];

class Raycaster {
    private result: { id: number | string; z: number; layerIndex: number; };

    // https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm
    static rayIntersectsTriangle(
        rayOrigin: number[],
        rayVector: number[],
        vertex0: number[],
        vertex1: number[],
        vertex2: number[],
        rayIntersectionPoint?: number[]
    ): number | null {
        const EPSILON = 1e-7;
        const edge1 = subtract([0, 0, 0], vertex1, vertex0);
        const edge2 = subtract([0, 0, 0], vertex2, vertex0);
        const h = cross([0, 0, 0], rayVector, edge2);
        const a = dot(edge1, h);
        if (a > -EPSILON && a < EPSILON) {
            // parallel to triangle
            return null;
        }
        const f = 1.0 / a;
        const s = subtract([0, 0, 0], rayOrigin, vertex0);
        const u = f * dot(s, h);
        if (u < 0.0 || u > 1.0) {
            return null;
        }
        const q = cross([0, 0, 0], s, edge1);
        const v = f * dot(rayVector, q);

        if (v < 0.0 || u + v > 1.0) {
            return null;
        }
        const intersectRayAtLength = f * dot(edge2, q);
        if (intersectRayAtLength > EPSILON) {
            if (rayIntersectionPoint) {
                add(rayIntersectionPoint, rayOrigin, scale(rayIntersectionPoint, rayVector, intersectRayAtLength));
            }
            return intersectRayAtLength;
        } else {
            return null;
        }
    };
    /**
     * screen matrix
     * world space -> screen space
     */
    sMat: Float32Array;
    /**
     * inverse screen matrix
     * screen space -> world space
     */
    iSMat: Float32Array;
    /**
     * ray origin in world space
     */
    origin: Vec3;
    /**
     * ray direction in world space
     */
    direction: Vec3;
    /**
     * ray origin in screen space
     */
    sOrigin: Vec3;
    /**
     * ray direction in screen space
     */
    sDirection: Vec3;
    /**
     * screen width in pixel
     * @private
     */
    private w: number;
    /**
     * screen height in pixel
     * @private
     */
    private h: number;

    /**
     * scale in worldspace
     * @private
     */
    scale: number;
    private pIntersection: Vec3;
    private invMapScale: number[];
    private invVpScale: number[];
    private intersectRayLength: number;

    constructor(screenMatrix: Float32Array, inverseScreenMatrix: Float32Array) {
        this.sMat = screenMatrix;
        this.iSMat = inverseScreenMatrix;

        this.origin = [0, 0, 0];
        this.direction = [0, 0, 0];
        this.sOrigin = [0, 0, 0];
        this.sDirection = [0, 0, 0];

        this.pIntersection = [0, 0, 0];
        this.intersectRayLength = 0;
    }

    getInverseScale(alignMap: boolean) {
        return alignMap ? this.invMapScale : this.invVpScale;
    }

    intersectAABBox(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number) {
        const rayDirX = this.direction[0];
        const rayDirY = this.direction[1];
        const rayDirZ = this.direction[2];

        const rayOriginX = this.origin[0];
        const rayOriginY = this.origin[1];
        const rayOriginZ = this.origin[2];

        const dirfracX = 1.0 / rayDirX;
        const dirfracY = 1.0 / rayDirY;
        const dirfracZ = 1.0 / rayDirZ;

        const t1 = (minX - rayOriginX) * dirfracX;
        const t2 = (maxX - rayOriginX) * dirfracX;
        const t3 = (minY - rayOriginY) * dirfracY;
        const t4 = (maxY - rayOriginY) * dirfracY;
        const t5 = (minZ - rayOriginZ) * dirfracZ;
        const t6 = (maxZ - rayOriginZ) * dirfracZ;
        const tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

        // ray intersects AABB
        if (tmax < 0) {
            return null;
        }
        const tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
        // no intersection
        if (tmin > tmax) {
            return null;
        }
        return tmin; // length of ray
    }

    intersectSphere(sphereCenter: Vec3, sphereRadius: number) {
        const L = subtract([], sphereCenter, this.origin);
        const tc = dot(L, this.direction);
        const d2 = dot(L, L) - tc * tc;
        const sqRadius = sphereRadius * sphereRadius;

        if (d2 > sqRadius) return null;

        const t0c = Math.sqrt(sqRadius - d2);

        // intersection with front of sphere
        const t0 = tc - t0c;

        // intersection with back of sphere
        const t1 = tc + t0c;

        // t0 and t1 are behind
        if (t0 < 0 && t1 < 0) return null;

        // inside sphere
        // if (t0 < 0) return add([], scale([], rayDirection, t1), rayOrigin)
        // front of sphere
        // return add([], scale([], rayDirection, t0), rayOrigin)

        return (t0 < 0) ? t1 : t0;
    }

    intersectEllipsoid(ellipsoidOrigin: Vec3, ellipsoidRadius: Vec3) {
        const origin = subtract([], this.origin, ellipsoidOrigin);
        const direction = this.direction; // normalize([], this.direction);
        const sqRadiusX = ellipsoidRadius[0] * ellipsoidRadius[0];
        const sqRadiusY = ellipsoidRadius[1] * ellipsoidRadius[1];
        const sqRadiusZ = ellipsoidRadius[2] * ellipsoidRadius[2];

        // const v = [0, 0, 0];
        // const _a = dot(multiply(v, rayDirection, rayDirection), [1/sqRadiusX, 1/sqRadiusY, 1/sqRadiusZ]);
        // const _b = dot(multiply(v, origin, rayDirection), [2/sqRadiusX, 2/sqRadiusY, 2/sqRadiusZ]);
        // const _c = dot(multiply(v, origin, origin), [1/sqRadiusX, 1/sqRadiusY, 1/sqRadiusZ]) - 1;

        const a = direction[0] * direction[0] / sqRadiusX
            + direction[1] * direction[1] / sqRadiusY
            + direction[2] * direction[2] / sqRadiusZ;

        const b = 2 * origin[0] * direction[0] / sqRadiusX
            + 2 * origin[1] * direction[1] / sqRadiusY
            + 2 * origin[2] * direction[2] / sqRadiusZ;

        const c = origin[0] * origin[0] / sqRadiusX
            + origin[1] * origin[1] / sqRadiusY
            + origin[2] * origin[2] / sqRadiusZ
            - 1;

        let d = ((b * b) - (4 * a * c));

        if (d < 0) {
            return null;
        } else {
            d = Math.sqrt(d);
        }
        const hit = (-b + d) / (2 * a);
        const hit2 = (-b - d) / (2 * a);

        return hit < hit2 ? hit : hit2;
    }

    init(x: number, y: number, width: number, height: number, scale: number, scaleZ: number) {
        const {sMat, iSMat, origin, direction, sOrigin, sDirection} = this;

        this.w = width;
        this.h = height;

        this.scale = scale;
        this.invMapScale = [1 / scale, 1 / scale, 1 / scale / scaleZ];
        this.invVpScale = [2 / width, 2 / height];

        origin[0] = x;
        origin[1] = y;
        origin[2] = -1;

        direction[0] = x;
        direction[1] = y;
        direction[2] = 0;

        transformMat4(origin, origin, iSMat);
        transformMat4(direction, direction, iSMat);

        transformMat4(sDirection, direction, sMat);
        transformMat4(sOrigin, origin, sMat);

        subtract(sDirection, sDirection, sOrigin);
        normalize(sDirection, sDirection);

        subtract(direction, direction, origin);
        normalize(direction, direction);


        this.result = {
            id: null,
            z: Infinity,
            layerIndex: null
        };
    }


    rayLengthScreenToWorld(p: number[]): number {
        const m = this.iSMat;
        const orgZ = this.origin[2];
        const dirZ = this.direction[2];
        const x = p[0];
        const y = p[1];
        let z = p[2];
        const w = m[3] * x + m[7] * y + m[11] * z + m[15];
        // translate z component only
        z = (m[2] * x + m[6] * y + m[10] * z + m[14]) / (w || 1.0);

        return (z - orgZ) / dirZ;
    }

    getIntersectionTop(): { id: number | string, z: number, layerIndex: number } {
        return this.result;
    }

    intersect(
        tileX: number,
        tileY: number,
        buffer: GeometryBuffer,
        layerIndex?: number
    ) {
        if (buffer.type == 'Image' || buffer.pointerEvents === false) return;

        const {result} = this;

        let featureId = buffer.rayIntersects(buffer, result, tileX, tileY, this);

        if (featureId != null) {
            result.id = featureId;
            result.layerIndex = layerIndex;
        }
    }
}

export {Raycaster};
