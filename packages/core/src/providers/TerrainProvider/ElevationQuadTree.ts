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

import {tileXYToQuadKey} from '../../tile/TileUtils';

const STRIDE = 3; // min, max, avg per entry

// Minimum block size (in pixels) per deepest pre-computed level.
// At 8×8 pixels per block (Level 5 for a 256-pixel heightmap),
// the stats are accurate enough for LOD decisions (~16KB serialized).
const MIN_BLOCK_SIZE = 8;

export interface ElevationStats {
    min: number;
    max: number;
    avg: number;
}

// Reusable result object to avoid GC pressure in hot paths
const _result: ElevationStats = {min: 0, max: 0, avg: 0};

// Reusable scratch buffers for build() — avoids allocation per tile.
// Sized for the maximum expected block count (Level 5 @ 512px = 1024 blocks).
let _scratchMins: Float32Array | null = null;
let _scratchMaxs: Float32Array | null = null;
let _scratchSums: Float32Array | null = null;

function getScratchBuffers(size: number) {
    if (!_scratchMins || _scratchMins.length < size) {
        _scratchMins = new Float32Array(size);
        _scratchMaxs = new Float32Array(size);
        _scratchSums = new Float32Array(size);
    }
    _scratchMins.fill(Infinity, 0, size);
    _scratchMaxs.fill(-Infinity, 0, size);
    _scratchSums.fill(0, 0, size);
    return {mins: _scratchMins, maxs: _scratchMaxs, sums: _scratchSums};
}

/**
 * A flat-array implicit quadtree storing min/max/avg elevation statistics
 * per tile subdivision level.
 *
 * Memory layout (Float32Array with stride 3):
 *   [min0, max0, avg0, min1, max1, avg1, ...]
 *
 * Index mapping:
 *   Level 1:   4 entries   (offset 0)
 *   Level 2:  16 entries   (offset 4)
 *   Level 3:  64 entries   (offset 20)
 *   Level 4: 256 entries   (offset 84)
 *   Level 5: 1024 entries  (offset 340)
 *   ...
 *   Level N: 4^N entries   (offset sum(4^1..4^(N-1)))
 *
 * Quadkey suffix → index: each digit (0-3) is 2 bits, concatenated to form
 * the position within the level. Combined with the level offset this gives
 * a direct array index without any hashing or string comparison.
 *
 * For suffixes deeper than pre-computed levels, the deepest pre-computed
 * ancestor is returned (conservative — its min/max envelope the child).
 *
 * Pre-computed levels are auto-determined from the heightmap dimensions:
 * `floor(log2(min(width, height) / MIN_BLOCK_SIZE))`, ensuring each deepest
 * block covers at least MIN_BLOCK_SIZE×MIN_BLOCK_SIZE pixels.
 *
 * @internal
 * @hidden
 */
export class ElevationQuadTree {
    // Pre-computed stats array (Float32Array, stride 3)
    private data: Float32Array;
    // Pre-computed level offsets for fast index calculation
    private levelOffsets: Uint32Array;
    // Number of pre-computed levels
    private precomputedLevels: number;
    // Global min elevation (raw, without exaggeration)
    min: number;
    // Global max elevation (raw, without exaggeration)
    max: number;

    /**
     * Create an ElevationQuadTree from a decoded heightmap.
     * Pre-computed levels are auto-determined from the heightmap dimensions.
     *
     * @param heightMap The decoded heightmap Float32Array (gridSize x gridSize)
     * @param width Pixel width of the source image (before border extension)
     * @param height Pixel height of the source image
     *
     * @internal
     * @hidden
     */
    constructor(heightMap: Float32Array, width: number, height: number) {
        // Auto-determine optimal pre-computed levels from image dimensions
        const minDim = Math.min(width, height);
        this.precomputedLevels = Math.max(1, Math.floor(Math.log2(minDim / MIN_BLOCK_SIZE)));

        // Compute total entries and level offsets
        const maxLevel = this.precomputedLevels;
        const offsets = new Uint32Array(maxLevel + 1);
        let totalEntries = 0;
        for (let l = 1; l <= maxLevel; l++) {
            offsets[l] = totalEntries;
            totalEntries += (1 << (2 * l)); // 4^l
        }
        this.levelOffsets = offsets;
        this.data = new Float32Array(totalEntries * STRIDE);

        // Build stats from heightmap
        this.min = Infinity;
        this.max = -Infinity;
        this.build(heightMap, width, height);
    }

    /**
     * Serialize the quadtree for transferable worker→main communication.
     * The returned Float32Array encodes: [precomputedLevels, min, max, ...data].
     * The existing system auto-detects TypedArrays as transferables.
     *
     * @internal
     * @hidden
     */
    serialize(): Float32Array {
        const header = 3;
        const result = new Float32Array(header + this.data.length);
        result[0] = this.precomputedLevels;
        result[1] = this.min;
        result[2] = this.max;
        result.set(this.data, header);
        return result;
    }

    /**
     * Restore an ElevationQuadTree from a serialized Float32Array (from worker).
     *
     * @param serialized The Float32Array produced by serialize()
     *
     * @internal
     * @hidden
     */
    static deserialize(serialized: Float32Array): ElevationQuadTree {
        const precomputedLevels = serialized[0];
        const min = serialized[1];
        const max = serialized[2];
        const data = serialized.subarray(3);

        const tree = Object.create(ElevationQuadTree.prototype) as ElevationQuadTree;
        tree.precomputedLevels = precomputedLevels;
        tree.min = min;
        tree.max = max;
        tree.data = data;

        // Rebuild level offsets
        const offsets = new Uint32Array(precomputedLevels + 1);
        let totalEntries = 0;
        for (let l = 1; l <= precomputedLevels; l++) {
            offsets[l] = totalEntries;
            totalEntries += (1 << (2 * l));
        }
        tree.levelOffsets = offsets;

        return tree;
    }

    /**
     * Build the pre-computed stats from the heightmap.
     *
     * @internal
     * @hidden
     */
    private build(heightMap: Float32Array, width: number, height: number) {
        const maxLevel = this.precomputedLevels;
        const n = 1 << maxLevel;
        const total = n * n;
        const hmSize = Math.round(Math.sqrt(heightMap.length));

        // Reuse scratch buffers across tiles (same worker thread)
        const {mins, maxs, sums} = getScratchBuffers(total);

        for (let y = 0; y < height; y++) {
            const ty = (y * n / height) | 0;
            const tyOffset = ty * n;
            const rowOffset = y * hmSize;
            for (let x = 0; x < width; x++) {
                const h = heightMap[rowOffset + x];
                const tx = (x * n / width) | 0;
                const i = tyOffset + tx;
                if (h < mins[i]) mins[i] = h;
                if (h > maxs[i]) maxs[i] = h;
                sums[i] += h;
            }
        }

        const pixelsPerBlock = (width * height) / total;

        // Write deepest level into flat array
        const deepOffset = this.levelOffsets[maxLevel];
        for (let ty = 0; ty < n; ty++) {
            for (let tx = 0; tx < n; tx++) {
                const i = ty * n + tx;
                const arrIdx = (deepOffset + this.gridToIndex(maxLevel, tx, ty)) * STRIDE;
                this.data[arrIdx] = mins[i];
                this.data[arrIdx + 1] = maxs[i];
                this.data[arrIdx + 2] = sums[i] / pixelsPerBlock;
            }
        }

        // Aggregate parent levels from children (deepest-1 down to 1)
        for (let level = maxLevel - 1; level >= 1; level--) {
            const childLevelOffset = this.levelOffsets[level + 1];
            const parentLevelOffset = this.levelOffsets[level];
            const pn = 1 << level;

            for (let ty = 0; ty < pn; ty++) {
                for (let tx = 0; tx < pn; tx++) {
                    const parentIdx = (parentLevelOffset + this.gridToIndex(level, tx, ty)) * STRIDE;
                    const cx = tx * 2;
                    const cy = ty * 2;
                    const c0 = (childLevelOffset + this.gridToIndex(level + 1, cx, cy)) * STRIDE;
                    const c1 = (childLevelOffset + this.gridToIndex(level + 1, cx + 1, cy)) * STRIDE;
                    const c2 = (childLevelOffset + this.gridToIndex(level + 1, cx, cy + 1)) * STRIDE;
                    const c3 = (childLevelOffset + this.gridToIndex(level + 1, cx + 1, cy + 1)) * STRIDE;

                    this.data[parentIdx] = Math.min(
                        this.data[c0], this.data[c1], this.data[c2], this.data[c3]
                    );
                    this.data[parentIdx + 1] = Math.max(
                        this.data[c0 + 1], this.data[c1 + 1], this.data[c2 + 1], this.data[c3 + 1]
                    );
                    this.data[parentIdx + 2] = (
                        this.data[c0 + 2] + this.data[c1 + 2] + this.data[c2 + 2] + this.data[c3 + 2]
                    ) / 4;
                }
            }
        }

        // Derive global min/max from level-1 children
        const off = this.levelOffsets[1];
        for (let i = 0; i < 4; i++) {
            const idx = (off + i) * STRIDE;
            if (this.data[idx] < this.min) this.min = this.data[idx];
            if (this.data[idx + 1] > this.max) this.max = this.data[idx + 1];
        }
    }

    /**
     * Get elevation stats for a child tile identified by its relative quadkey suffix.
     * Pre-computed levels are returned directly from the flat array.
     * For deeper suffixes, the deepest pre-computed ancestor is returned
     * (conservative — its min/max envelope the actual child values).
     *
     * @param suffix Relative quadkey suffix (e.g. '0213' for a level-4 child)
     * @returns Elevation stats (raw, without exaggeration) or null if unavailable
     *
     * @internal
     * @hidden
     */
    get(suffix: string): ElevationStats | null {
        if (!suffix || suffix.length === 0) return null;

        let level = suffix.length;

        // For suffixes deeper than pre-computed, use the deepest ancestor
        if (level > this.precomputedLevels) {
            level = this.precomputedLevels;
        }

        const index = this.suffixToIndex(suffix, level);
        const offset = this.levelOffsets[level];
        const arrIdx = (offset + index) * STRIDE;
        const min = this.data[arrIdx];
        if (!Number.isFinite(min)) return null;
        _result.min = min;
        _result.max = this.data[arrIdx + 1];
        _result.avg = this.data[arrIdx + 2];
        return _result;
    }

    /**
     * Convert a quadkey suffix string to a flat index within its level.
     * Each digit (0-3) contributes 2 bits to the Morton/Z-order index.
     * Only the first `level` characters are used.
     *
     * @internal
     * @hidden
     */
    private suffixToIndex(suffix: string, level?: number): number {
        const len = level ?? suffix.length;
        let index = 0;
        for (let i = 0; i < len; i++) {
            index = (index << 2) | (suffix.charCodeAt(i) - 48);
        }
        return index;
    }

    /**
     * Convert grid coordinates (tx, ty) at a given level to a Morton/Z-order index.
     *
     * @internal
     * @hidden
     */
    private gridToIndex(level: number, tx: number, ty: number): number {
        let index = 0;
        for (let i = level - 1; i >= 0; i--) {
            const bx = (tx >> i) & 1;
            const by = (ty >> i) & 1;
            index = (index << 2) | (by << 1) | bx;
        }
        return index;
    }

    /**
     * Lookup elevation stats by grid coordinates relative to this tile.
     *
     * @param level Number of zoom levels deeper than this tile (e.g. 3 = 3 levels of subdivision)
     * @param localX X index within the level (0..2^level-1), relative to this tile's top-left
     * @param localY Y index within the level (0..2^level-1), relative to this tile's top-left
     * @returns ElevationStats or null if not available
     *
     * @internal
     * @hidden
     */
    getByGrid(level: number, localX: number, localY: number): ElevationStats | null {
        if (level <= 0) return null;
        const effectiveLevel = Math.min(level, this.precomputedLevels);
        // When requested level is deeper than precomputed, use ancestor at precomputed depth
        const shift = level - effectiveLevel;
        const ancestorX = localX >> shift;
        const ancestorY = localY >> shift;
        const index = this.gridToIndex(effectiveLevel, ancestorX, ancestorY);
        const offset = this.levelOffsets[effectiveLevel];
        const arrIdx = (offset + index) * STRIDE;
        const min = this.data[arrIdx];
        if (!Number.isFinite(min)) return null;
        _result.min = min;
        _result.max = this.data[arrIdx + 1];
        _result.avg = this.data[arrIdx + 2];
        return _result;
    }

    /**
     * Debug helper: returns the pre-computed stats as a human-readable object
     * with quadkey strings as keys.
     *
     * @internal
     * @hidden
     */
    toJSON(): { [quadkey: string]: { min: number; max: number; avg: number } } {
        const result: { [quadkey: string]: { min: number; max: number; avg: number } } = {};

        for (let level = 1; level <= this.precomputedLevels; level++) {
            const n = 1 << level;
            const offset = this.levelOffsets[level];
            for (let ty = 0; ty < n; ty++) {
                for (let tx = 0; tx < n; tx++) {
                    const idx = (offset + this.gridToIndex(level, tx, ty)) * STRIDE;
                    const min = this.data[idx];
                    if (!Number.isFinite(min)) continue;
                    const quadkey = tileXYToQuadKey(level, ty, tx);
                    result[quadkey] = {
                        min: this.data[idx],
                        max: this.data[idx + 1],
                        avg: this.data[idx + 2]
                    };
                }
            }
        }

        return result;
    }

    /**
     * Sample a sub-region of the heightmap for a quadkey deeper than pre-computed
     * levels, and cache the result.
     *
     * @internal
     * @hidden
     */
    private sampleFromHeightMap(suffix: string, heightMap: Float32Array): ElevationStats | null {
        const size = Math.round(Math.sqrt(heightMap.length));
        // Compute the sub-region bounds from the suffix
        let nx = 0; let ny = 0; let scale = 1;
        for (let i = 0; i < suffix.length; i++) {
            scale *= 0.5;
            const digit = suffix.charCodeAt(i) - 48;
            nx += (digit & 1) * scale;
            ny += ((digit >> 1) & 1) * scale;
        }
        // Scan the sub-region
        const startX = Math.floor(nx * size);
        const startY = Math.floor(ny * size);
        const endX = Math.min(Math.ceil((nx + scale) * size), size);
        const endY = Math.min(Math.ceil((ny + scale) * size), size);
        const count = (endX - startX) * (endY - startY);

        if (count <= 0) return null;

        let min = Infinity;
        let max = -Infinity;
        let total = 0;

        for (let y = startY; y < endY; y++) {
            const rowOffset = y * size;
            for (let x = startX; x < endX; x++) {
                const h = heightMap[rowOffset + x];
                if (h < min) min = h;
                if (h > max) max = h;
                total += h;
            }
        }
        return {min, max, avg: total / count};
    }
}
