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

import {add, cross, dot, normalize, scale, subtract, transformMat4} from 'gl-matrix/vec3';
import {GeometryBuffer} from './buffer/GeometryBuffer';
import {RenderTile, RenderTileTarget} from './RenderTile';
import {invert, multiply} from 'gl-matrix/mat4';
import {TerrainOcclusionMode} from './buffer/TerrainRenderPolicy';

export type Vec3 = [number, number, number];

type PickResultSource = 'none' | 'terrain' | 'terrain-overlay' | 'feature';

type Result = {
    id: number | string;
    z: number;
    pointWorld: number[];
    origin?: Float32Array;
    direction?: Float32Array;
    localMatrix?: Float32Array;
}

export type LocalRay = {
    origin: Float32Array;
    direction: Float32Array;
    modelMatrix: Float32Array;
    invModelMatrix?: Float32Array;
}

type TerrainHit = {
    pointWorld: Vec3 | null;
    z: number;
    tileInvMatrix?: Float32Array | null;
    tileMatrix?: Float32Array | null;
    tileX: number;
    tileY: number;
    terrainTileQuadkey?: string | null;
};

export type Ray = {
    origin: Float32Array;
    direction: Float32Array;
    space: 'world' | 'screen' | 'local';
};

// export type PickRay = Ray & { screenOrigin?: Float32Array };


class Raycaster {
    private result: Result;

    // https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm
    static rayIntersectsTriangle(
        rayOrigin: number[] | Float32Array,
        rayVector: number[] | Float32Array,
        vertex0: number[] | Float32Array,
        vertex1: number[] | Float32Array,
        vertex2: number[] | Float32Array,
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

    static getPointAtRayLength(rayLength: number, rayOrigin: Vec3 | Float32Array, rayVector: Vec3 | Float32Array, point = []) {
        return add(point, rayOrigin, scale(point, rayVector, rayLength));
    }

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
    origin: Vec3 | Float32Array;
    /**
     * ray direction in world space
     */
    direction: Vec3 | Float32Array;
    /**
     * ray origin in screen space
     */
    sOrigin: Vec3 | Float32Array;
    /**
     * ray direction in screen space
     */
    sDirection: Vec3 | Float32Array;
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

    private invScaleFactor: [number, number, number] = [1, 1, 1];

    scaleZ: number;

    // Spatial tile scale, independent of the renderer's symbol-size calibration.
    tileScale: number = 1;

    // RenderTile scales/translates XY only. Snapshot reusable matrices; identity outside intersections.
    private anchorScaleX: number = 1;
    private anchorScaleY: number = 1;
    private anchorTranslateX: number = 0;
    private anchorTranslateY: number = 0;

    // Terrain vertical exaggeration factor. Used for visual terrain scaling — ray intersection operates in
    // exaggerated space, but the reported pointWorld is de-exaggerated back to real height.
    exaggeration: number = 1;

    constructor(screenMatrix: Float32Array, inverseScreenMatrix: Float32Array) {
        this.sMat = screenMatrix;
        this.iSMat = inverseScreenMatrix;

        this.origin = [0, 0, 0];
        this.direction = [0, 0, 0];
        this.sOrigin = [0, 0, 0];
        this.sDirection = [0, 0, 0];
    }

    getInverseWorldScale(tileScale: number): [number, number, number] {
        const {invScaleFactor} = this;

        const invScaleXY = 1 / tileScale;
        invScaleFactor[0] = invScaleXY;
        invScaleFactor[1] = invScaleXY;
        invScaleFactor[2] = 1 / (this.scaleZ * this.scale);

        return invScaleFactor;
    }

    // Convert only the sizing anchor. Z is already exaggerated world meters.
    getLocalAltitudeScale(
        x: number,
        y: number,
        z: number,
        scaleByAltitude: boolean,
        referenceW: number
    ): number {
        if (scaleByAltitude) return 1;
        return this.getAltitudeScale(
            x * this.anchorScaleX + this.anchorTranslateX,
            y * this.anchorScaleY + this.anchorTranslateY,
            z,
            false,
            referenceW
        );
    }

    // Calculate perspective sizing from a world-coordinate anchor, independent of the active ray.
    getAltitudeScale(
        x: number,
        y: number,
        z: number,
        scaleByAltitude: boolean,
        referenceW: number
    ): number {
        // Meter-sized geometry keeps its natural perspective scaling.
        if (scaleByAltitude) {
            return 1;
        }
        const {sMat} = this;
        const groundW = sMat[3] * x + sMat[7] * y + sMat[15];
        const clipW = groundW + sMat[11] * z;
        const calibrationW = referenceW > 0 ? referenceW : groundW;
        return clipW / calibrationW;
    }

    intersectAABBox(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number, origin = this.origin, direction = this.direction) {
        const [rayDirX, rayDirY, rayDirZ] = direction;
        const [rayOriginX, rayOriginY, rayOriginZ] = origin;

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

    beginPick(
        x: number,
        y: number,
        width: number,
        height: number,
        scale: number,
        scaleZ: number,
        exaggeration: number = 1,
        terrainOcclusionSupported: boolean = true
    ) {
        const {sMat, iSMat, origin, direction, sOrigin, sDirection} = this;

        this.w = width;
        this.h = height;
        this.scale = scale;
        this.exaggeration = Math.max(1e-6, exaggeration);
        this.terrainOcclusionSupported = terrainOcclusionSupported;

        // const invScaleXY = 1 / scale;
        // this.invMapScale[0] = invScaleXY;
        // this.invMapScale[1] = invScaleXY;
        // this.invMapScale[2] = invScaleXY / scaleZ;
        //
        // this.invVpScale[0] = 2 / width;
        // this.invVpScale[1] = 2 / height;

        this.scaleZ = scaleZ;
        // this.scaleZ = this.sMat[11]/scale;

        sOrigin[0] = x;
        sOrigin[1] = y;
        sOrigin[2] = -1;

        direction[0] = x;
        direction[1] = y;
        direction[2] = 0;

        transformMat4(origin, sOrigin, iSMat);
        transformMat4(direction, direction, iSMat);

        transformMat4(sDirection, direction, sMat);
        // transformMat4(sOrigin, origin, sMat);

        subtract(sDirection, sDirection, sOrigin);
        normalize(sDirection, sDirection);

        subtract(direction, direction, origin);
        normalize(direction, direction);


        this.result = {
            id: null,
            z: Infinity,
            pointWorld: null
        };

        this.terrainHit.z = Infinity;
        this.terrainHit.pointWorld = null;
        this.terrainHit.tileInvMatrix = null;
        this.terrainHit.tileMatrix = null;
        this.terrainHit.tileX = NaN;
        this.terrainHit.tileY = NaN;
        this.terrainHit.terrainTileQuadkey = null;
        this.pickResultSource = 'none';
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

    getIntersectionTop(): Result {
        const {result} = this;
        if (result.z != Infinity) {
            // result.z is always in world-space ray-length units.
            const hitPoint = Raycaster.getPointAtRayLength(result.z, this.origin, this.direction);
            // de-exaggerate: ray intersection operates in exaggerated space (matching visual terrain),
            // but the reported world point should reflect the real (un-exaggerated) altitude.
            hitPoint[2] /= this.exaggeration;
            result.pointWorld = hitPoint;
        }
        return result;
    }

    canPickOverTerrain(buffer: GeometryBuffer): boolean {
        // Screen-depth terrain overlays are rendered from their anchor depth,
        // so a terrain hit at the pointer position must not hide the overlay.
        // TODO: Mirror the shader's anchor-depth occlusion check so hidden overlays
        // are not picked merely because their buffer uses terrain occlusion.
        return this.terrainOcclusionSupported &&
            buffer.terrainOcclusion === TerrainOcclusionMode.TERRAIN &&
            (this.pickResultSource === 'terrain' ||
                (this.pickResultSource === 'none' && this.terrainHit.pointWorld != null));
    }

    // used to transform ray from world space to local space
    private localRay: LocalRay = {
        origin: new Float32Array(3),
        direction: new Float32Array(3),
        modelMatrix: new Float32Array(16),
        invModelMatrix: new Float32Array(16)
    };

    private transformRayToLocal(modelMatrix: Float32Array): LocalRay {
        const origin = this.origin;
        const direction = this.direction;


        const localRay = this.localRay;
        const invModelMatrix = invert(localRay.invModelMatrix, modelMatrix);
        transformMat4(localRay.origin, origin, invModelMatrix);
        const localDirection = localRay.direction;
        // transform direction, ignores translation
        // const rotationMat3 = mat3.fromMat4([], invModelMatrix);
        // vec3.transformMat3(localDirection, direction, rotationMat3);
        localDirection[0] = direction[0] * invModelMatrix[0] + direction[1] * invModelMatrix[4] + direction[2] * invModelMatrix[8];
        localDirection[1] = direction[0] * invModelMatrix[1] + direction[1] * invModelMatrix[5] + direction[2] * invModelMatrix[9];
        localDirection[2] = direction[0] * invModelMatrix[2] + direction[1] * invModelMatrix[6] + direction[2] * invModelMatrix[10];

        normalize(localDirection, localDirection);

        localRay.modelMatrix = modelMatrix;
        return localRay;
    }

    private terrainHit: TerrainHit = {
        pointWorld: null,
        tileInvMatrix: null,
        tileMatrix: null,
        z: Infinity,
        tileX: NaN,
        tileY: NaN
    };

    private _tmpDelta: Vec3 = [0, 0, 0];

    // tracks the source of the currently selected result so terrain only
    // yields to an already selected screen-depth overlay.
    private pickResultSource: PickResultSource = 'none';

    private terrainOcclusionSupported: boolean = true;

    private worldRayLength(point: Vec3 | number[], origin: Vec3 | Float32Array, direction: Vec3 | Float32Array): number {
        const delta = subtract(this._tmpDelta, point, origin);
        // dir is normalized
        return dot(delta, direction);
    }

    private intersectBuffer(buffer: GeometryBuffer, result: {z: number}, tileX: number, tileY: number, anchorToWorld: Float32Array): string | number {
        const {anchorScaleX, anchorScaleY, anchorTranslateX, anchorTranslateY} = this;
        this.anchorScaleX = anchorToWorld[0];
        this.anchorScaleY = anchorToWorld[5];
        this.anchorTranslateX = anchorToWorld[12];
        this.anchorTranslateY = anchorToWorld[13];
        try {
            return buffer.rayIntersects(buffer, result, tileX, tileY, this);
        } finally {
            this.anchorScaleX = anchorScaleX;
            this.anchorScaleY = anchorScaleY;
            this.anchorTranslateX = anchorTranslateX;
            this.anchorTranslateY = anchorTranslateY;
        }
    }

    prepareTerrainHit(renderTile: RenderTile) {
        const buffer = renderTile.buffer;
        const worldOrigin = this.origin;
        const worldDirection = this.direction;
        const localRay = this.transformRayToLocal(renderTile.getModelMatrix());
        this.origin = localRay.origin;
        this.direction = localRay.direction;
        // isolate terrain DDA from shared result.z so each LOD tile finds its own closest hit.
        // Without this, a previous terrain tile with a different scale could block hits
        // (local t-values are not comparable across tiles with different model-matrix scales).
        const result = {z: Infinity};

        let featureId: string | number;
        try {
            featureId = this.intersectBuffer(buffer, result, 0, 0, renderTile.getModelMatrix());
        } finally {
            this.origin = worldOrigin;
            this.direction = worldDirection;
        }

        if (featureId == null) {
            return null;
        }

        const localT = result.z;

        // compute world hit point for correct cross-tile comparison
        const localHitPoint = Raycaster.getPointAtRayLength(localT, localRay.origin, localRay.direction);
        const worldHitPoint = transformMat4(localHitPoint, localHitPoint, renderTile.getModelMatrix());
        const worldT = this.worldRayLength(worldHitPoint, worldOrigin, worldDirection);

        // update terrainHit in world-space (for offscreen data tile picking phase)
        if (worldT < this.terrainHit.z) {
            this.terrainHit.z = worldT;
            this.terrainHit.pointWorld = worldHitPoint as Vec3;
            this.terrainHit.tileX = renderTile.data.tile.x;
            this.terrainHit.tileY = renderTile.data.tile.y;
            this.terrainHit.tileInvMatrix = renderTile.getInverseModelMatrix().slice();
            this.terrainHit.tileMatrix = renderTile.getModelMatrix().slice();
            this.terrainHit.terrainTileQuadkey = renderTile.data.terrainTileQuadkey || renderTile.data.tile.quadkey;
        }

        return {id: featureId, z: worldT};
    }

    intersect(
        renderTile: RenderTile,
        ignoreTerrainOcclusion: boolean = false
    ): string | number | null {
        const buffer = renderTile.buffer;
        const result = this.result;
        const orgOrigin = this.origin;
        const orgDirection = this.direction;
        const isOffscreenBuffer = renderTile.renderTarget === RenderTileTarget.OffscreenTerrain;
        const isTerrainBuffer = buffer.type === 'Terrain';
        let localRay: LocalRay | null = null;
        let featureId: string | number | null = null;

        if (isTerrainBuffer) {
            const hit = this.prepareTerrainHit(renderTile);
            if (hit && hit.z <= this.terrainHit.z && hit.z < result.z &&
                this.pickResultSource !== 'terrain-overlay') {
                result.z = hit.z;
                this.pickResultSource = 'terrain';
                featureId = hit.id;
            }
        } else {
            const tileMatrix = renderTile.getModelMatrix();
            const savedTileScale = this.tileScale;
            const renderSpace = buffer.getRenderSpace();
            let tileX = 0;
            let tileY = 0;
            if (renderSpace === 'screen' && !isOffscreenBuffer) {
                // Tile-to-world translation includes preview offsets.
                // sMat handles world-to-screen projection.
                tileX = tileMatrix[12];
                tileY = tileMatrix[13];
            }
            if (renderSpace === 'world' && !isOffscreenBuffer) {
                localRay = this.transformRayToLocal(tileMatrix);
                this.origin = localRay.origin;
                this.direction = localRay.direction;
            }

            if (isOffscreenBuffer) {
                this.tileScale = tileMatrix[0];
                try {
                    featureId = this.intersectWithLocalOrthoRay(buffer, renderTile);
                } finally {
                    this.tileScale = savedTileScale;
                }

                if (featureId != null) {
                    // offscreen features lie on the terrain surface, accept them unless a closer
                    // 3D hit exists. Support terrain itself need not be selectable.
                    if (result.z >= this.terrainHit.z) {
                        result.z = this.terrainHit.z;
                        result.id = featureId;
                    } else {
                        featureId = null;
                    }
                }
            } else {
                const prevZ = result.z;
                const canPickOverTerrain = this.canPickOverTerrain(buffer);
                this.tileScale = tileMatrix[0];
                try {
                    featureId = this.intersectBuffer(buffer, result, tileX, tileY, tileMatrix);
                } finally {
                    this.origin = orgOrigin;
                    this.direction = orgDirection;
                    this.tileScale = savedTileScale;
                }
                if (featureId != null && localRay && result.z !== prevZ) {
                    // convert result.z from local to world-space so hits across tiles with
                    // different model-matrix scales (LOD) are comparable.
                    const localHit = Raycaster.getPointAtRayLength(result.z, localRay.origin, localRay.direction);
                    const worldHit = transformMat4(localHit, localHit, localRay.modelMatrix);
                    result.z = this.worldRayLength(worldHit, orgOrigin, orgDirection);

                    localRay = null;
                }
                if (featureId != null && !ignoreTerrainOcclusion && !canPickOverTerrain &&
                    result.z > this.terrainHit.z) {
                    result.z = prevZ;
                    featureId = null;
                }
            }
        }

        if (featureId != null) {
            if (!isTerrainBuffer) {
                this.pickResultSource = !isOffscreenBuffer && renderTile.isTerrainOcclusionCandidate()
                    ? 'terrain-overlay'
                    : 'feature';
            }
            result.id = featureId;
        }

        return featureId;
    }

    private _tmpRayOrthoOrigin = new Float32Array([0, 0, 10_000]);
    private _tmpRayOrthoDir = new Float32Array([0, 0, -1]);
    // separate result object for ortho ray tests to avoid wiping the main result's z
    private _orthoResult: { z: number } = {z: Infinity};
    private _orthoAnchorMatrix = new Float32Array(16);

    private intersectWithLocalOrthoRay(buffer: GeometryBuffer, renderTile: RenderTile): string | number | null {
        const hit = this.terrainHit;
        if (!hit.pointWorld) return null;
        const {_tmpRayOrthoOrigin, _tmpRayOrthoDir} = this;
        // skip data tiles that do not belong to the hit terrain tile. same-level tiles share
        // local coordinates and could otherwise select features from an adjacent tile.
        const dataTerrainQK = renderTile.data.terrainTileQuadkey;
        if (dataTerrainQK && hit.terrainTileQuadkey && dataTerrainQK !== hit.terrainTileQuadkey) {
            return null;
        }
        // world -> Terrain-tile-local (0..terrainTileSize)
        transformMat4(_tmpRayOrthoOrigin, hit.pointWorld, hit.tileInvMatrix);

        // Terrain-tile-local -> Vertex-local (0..dataTileSize)
        // the data tiles model matrix contains the offscreen transform (translate + scale)
        // that maps vertex coords to terrain-tile coords. The inverse reverses this.
        transformMat4(_tmpRayOrthoOrigin, _tmpRayOrthoOrigin, renderTile.getInverseModelMatrix());
        _tmpRayOrthoOrigin[2] = 10_000;

        // _tmpRayOrthoDir[0] = 0;
        // _tmpRayOrthoDir[1] = 0;
        // _tmpRayOrthoDir[2] = -1;

        const savedOrigin = this.origin;
        const savedDir = this.direction;
        const savedSOrigin = this.sOrigin;
        const savedSDir = this.sDirection;

        this._orthoResult.z = Infinity;
        // The offscreen model matrix maps data vertices to terrain-tile coordinates, not world.
        // Flat offscreen anchors retain Z = 0 and referenceW = 0, hence unit altitude scaling.
        multiply(this._orthoAnchorMatrix, hit.tileMatrix, renderTile.getModelMatrix());
        this.origin = this.sOrigin = _tmpRayOrthoOrigin;
        this.direction = this.sDirection = _tmpRayOrthoDir;
        try {
            return this.intersectBuffer(buffer, this._orthoResult, 0, 0, this._orthoAnchorMatrix);
        } finally {
            this.origin = savedOrigin;
            this.direction = savedDir;
            this.sOrigin = savedSOrigin;
            this.sDirection = savedSDir;
        }
    }

    hasTerrainHitForTile(tileX: number, tileY: number) {
        // const hit = this.terrainHit;
        // return hit.pointWorld != null && hit.tileX === tileX && hit.tileY === tileY;

        // only check that a terrain hit exists. Spatial filtering for whether this data tile overlaps the terrain hit
        // is handled by intersectTileAABB and intersectWithLocalOrthoRay (returns null if point is outside geometry).
        const hasHit = this.terrainHit.pointWorld != null;
        return hasHit;
    }
}

export {Raycaster};
