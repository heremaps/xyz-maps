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

import {RenderTarget} from './RenderTarget';
import {GraphicsDevice} from './device/GraphicsDevice';
import {Texture} from './Texture';
import {HeightMapTileCache} from './HeightMapTileCache';


export type TileOffscreenRenderTarget = RenderTarget & {
    requiresClear?: boolean;
    offscreenOverlayTexture?: Texture;
};

/**
 * A combined FBO + color-texture unit.
 * The texture stays permanently attached to the FBO, eliminating per-frame `framebufferTexture2D` calls.
 *
 * @internal
 * @hidden
 */
interface OffscreenUnit {
    fbo: RenderTarget;
    texture: Texture;
    size: number;
    // Rolling hash of buffer UIDs rendered into this FBO. Used for content caching.
    contentHash: number;
    // True if this unit was a cache hit this frame — all draw calls should be skipped.
    cached: boolean;
}

/**
 * Size-bucketed pool for OffscreenUnits.
 * Eliminates resize thrashing by returning units that already match the requested size.
 *
 * @internal
 * @hidden
 */
class OffscreenUnitPool {
    // size -> free units
    private buckets: Map<number, OffscreenUnit[]> = new Map();

    acquire(device: GraphicsDevice, size: number): OffscreenUnit {
        const bucket = this.buckets.get(size);
        if (bucket && bucket.length > 0) {
            return bucket.pop()!;
        }
        // create new unit with texture permanently attached
        const texture = new Texture(device, {width: size, height: size}, {mipMaps: false});
        const fbo = new RenderTarget(device, {
            width: size,
            height: size,
            depthStencilMode: 'depth-stencil',
            colorTexture: texture
        });
        return {fbo, texture, size, contentHash: -1, cached: false};
    }

    release(unit: OffscreenUnit): void {
        const bucket = this.buckets.get(unit.size);
        if (bucket) {
            bucket.push(unit);
        } else {
            this.buckets.set(unit.size, [unit]);
        }
    }

    clear(device: GraphicsDevice): void {
        for (const [, bucket] of this.buckets) {
            for (const unit of bucket) {
                unit.fbo.destroy(device);
                unit.texture.destroy();
            }
        }
        this.buckets.clear();
    }
}

/**
 * Manages offscreen FBOs for terrain overlay rendering.
 *
 * Optimizations over previous implementation:
 * 1. Size-bucketed pool: no resize thrashing when returning units to/from pool.
 * 2. Merged FBO+Texture: texture is permanently attached, no per-frame framebufferTexture2D calls.
 * 3. Frame-persistent caching: FBOs whose terrainQuadkey is still active are kept across frames
 *    without release+re-acquire+re-clear. Only stale entries are recycled.
 *
 * @internal
 * @hidden
 */
export class RenderTargetManager {
    private pool: OffscreenUnitPool = new OffscreenUnitPool();

    // currently active units this frame, keyed by terrainQuadkey
    private active: Map<string, OffscreenUnit> = new Map();

    // units from previous frame, keyed by terrainQuadkey. At beginFrame() these get candidates for reuse or recycling.
    private previous: Map<string, OffscreenUnit> = new Map();

    // forces all terrain FBOs to be rendered once in the next frame.
    private forceRefreshNextFrame: boolean = false;

    constructor(private device: GraphicsDevice, private terrainHeightMapCache: HeightMapTileCache) {
    }

    /**
     * invalidates the content cache for one upcoming frame to enforce refresh/rerendering.
     *
     * @internal
     * @hidden
     */
    invalidate(): void {
        this.forceRefreshNextFrame = true;
    }

    /**
     * get or create an offscreen FBO+texture for the given terrain quadkey.
     * returns null if the content hash matches the previous frame (cache hit — skip rendering).
     *
     * @internal
     * @hidden
     */
    getOrCreate(key: string, size: number, contentHash?: number): TileOffscreenRenderTarget | null {
        // already active this frame? Return null if cached, otherwise the FBO.
        let unit = this.active.get(key);
        if (unit) {
            if (unit.cached) return null;
            const fbo = unit.fbo as TileOffscreenRenderTarget;
            fbo.requiresClear = false;
            return fbo;
        }

        // carried over from previous frame? Check content hash for cache hit.
        unit = this.previous.get(key);
        if (unit) {
            this.previous.delete(key);
            if (unit.size !== size) {
                // size changed -> recycle old unit, acquire new one
                this.pool.release(unit);
                unit = null;
            } else if (!this.forceRefreshNextFrame && contentHash !== undefined && unit.contentHash === contentHash) {
                // content unchanged — register in active (so getOverlayTexture works),
                // but return null to signal: skip all draw calls.
                unit.cached = true;
                this.active.set(key, unit);
                return null;
            }
            // otherwise: same size but content changed -> re-render
        }

        unit ||= this.pool.acquire(this.device, size);

        if (contentHash !== undefined) {
            unit.contentHash = contentHash;
        }
        unit.cached = false;

        this.active.set(key, unit);

        const fbo = unit.fbo as TileOffscreenRenderTarget;
        fbo.requiresClear = true;
        fbo.offscreenOverlayTexture = unit.texture;

        return fbo;
    }

    /**
     * look up the overlay texture for a terrain quadkey.
     * used by TerrainProgram.preparePass() to bind the overlay map.
     *
     * @internal
     * @hidden
     */
    getOverlayTexture(key: string): Texture | undefined {
        return this.active.get(key)?.texture;
    }

    /**
     * called at the beginning of a frame.
     * recycles FBOs that are no longer needed and keeps active ones for the new frame.
     *
     * @internal
     * @hidden
     */
    beginFrame(): void {
        // release any previous-frame units that weren't reused this frame
        for (const [, unit] of this.previous) {
            this.pool.release(unit);
        }
        // clear terrain overlay texture references in heightmap cache
        for (const terrainData of this.terrainHeightMapCache.values()) {
            terrainData.offscreenOverlayTexture = null;
        }
        // swap so current active becomes previous for next frame
        const tmp = this.previous;
        this.previous = this.active;
        this.active = tmp;
        this.active.clear();
    }

    endFrame(): void {
        this.forceRefreshNextFrame = false;
    }

    destroy(): void {
        for (const [, unit] of this.active) {
            unit.fbo.destroy(this.device);
            unit.texture.destroy();
        }
        for (const [, unit] of this.previous) {
            unit.fbo.destroy(this.device);
            unit.texture.destroy();
        }
        this.active.clear();
        this.previous.clear();
        this.pool.clear(this.device);
    }
}
