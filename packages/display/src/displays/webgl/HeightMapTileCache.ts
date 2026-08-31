/*
 * Copyright (C) 2019-2025 HERE Europe B.V.
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
import {Texture} from './Texture';
import {GraphicsDevice} from './device/GraphicsDevice';
import {ElevationQuadTree, tileUtils} from '@here/xyz-maps-core';

export type TileXYZ = Uint32Array;

export type HeightMapTileData = {
    tileSize?: number;
    size?: number;
    padding?: number;
    data?: Float32Array;
    min: number;
    max: number;
    // ElevationQuadTree instance providing per-child-tile elevation statistics.
    elevationTree?: ElevationQuadTree;
    texture?: Texture;
    offscreenOverlayTexture?: Texture;
    // if skirt is 0 or undefined, no skirt, otherwise the value defines the height of the skirt
    skirtHeight?: number;
}

/**
 * Bilinear heightmap sample matching the GPU shader's getTerrainHeight() exactly.
 *
 * Shader equivalent:
 * ```glsl
 * float logicalSize = texSize - 2.0 * padding;
 * vec2 logicalUV = tilePixelPos / tileSize;
 * logicalUV = uHeightMapTransform.xy + logicalUV * uHeightMapTransform.z;
 * vec2 texCoord = vec2(padding) + logicalUV * (logicalSize - 1.0);
 * // bilinear at texCoord
 * ```
 *
 * @param data       Heightmap Float32Array
 * @param size       Heightmap grid size (width = height = sqrt(data.length))
 * @param tileSize   Tile pixel size (e.g. 256 or 512)
 * @param tilePixelX X position in tile-pixel space (0..tileSize)
 * @param tilePixelY Y position in tile-pixel space (0..tileSize)
 * @param hmOffsetX  UV transform offset X (0 for source tiles)
 * @param hmOffsetY  UV transform offset Y (0 for source tiles)
 * @param hmScale    UV transform scale (1 for source tiles)
 * @param padding    Number of padding samples around the logical heightmap
 * @returns Raw height value (without exaggeration)
 *
 * @internal
 * @hidden
 */
export function sampleHeightMap(
    data: Float32Array,
    size: number,
    tileSize: number,
    tilePixelX: number,
    tilePixelY: number,
    hmOffsetX: number = 0,
    hmOffsetY: number = 0,
    hmScale: number = 1,
    padding: number = 0
): number {
    const logicalSize = size - 2 * padding;
    const logicalGridSize = logicalSize - 1;
    const logicalX = hmOffsetX + tilePixelX / tileSize * hmScale;
    const logicalY = hmOffsetY + tilePixelY / tileSize * hmScale;
    // Map logical tile coordinates to physical texel coordinates. Coordinates
    // outside [0, tileSize] intentionally address the padding ring.
    const tx = padding + logicalX * logicalGridSize;
    const ty = padding + logicalY * logicalGridSize;
    // Clamp texel indices to valid range [0, size-2] for bilinear 2x2 kernel
    const ix = Math.max(0, Math.min(size - 2, Math.floor(tx)));
    const iy = Math.max(0, Math.min(size - 2, Math.floor(ty)));
    // Fractional part for interpolation weights (clamped to prevent extrapolation
    // for coordinates beyond the heightmap extent — matches CLAMP_TO_EDGE behavior)
    const fx = Math.max(0, Math.min(1, tx - ix));
    const fy = Math.max(0, Math.min(1, ty - iy));
    // Pre-compute row offsets (avoids redundant iy*size and (iy+1)*size)
    const row0 = iy * size + ix;
    const row1 = row0 + size;
    // Fetch 2x2 texel neighbourhood
    const h00 = data[row0];
    const h10 = data[row0 + 1];
    const h01 = data[row1];
    const h11 = data[row1 + 1];
    // Bilinear interpolation (Horner form: 4 multiplies instead of 8)
    return (h00 + (h10 - h00) * fx) * (1 - fy) + (h01 + (h11 - h01) * fx) * fy;
}

export class HeightMapTileCache {
    tileSize: number;
    padding: number = 1;

    private emptyTexture: Texture;
    private data: Map<number, HeightMapTileData> = new Map();

    public readonly version: number = 0;

    private incVersion() {
        (this.version as any)++;
    }

    get tilePadding(): number {
        return 2 * this.padding;
    }

    /**
     * compute a numeric cache key from tile coordinates.
     * supports zoom 0..24 and x/y 0..16777215 (2^24 - 1).
     * uses arithmetic packing: zoom * 2^48 + x * 2^24 + y.
     *
     * @internal
     * @hidden
     */
    static tileKey(zoom: number, x: number, y: number): number {
        return zoom * 281474976710656 + x * 16777216 + y;
    }

    /**
     * convert a quadkey string to a numeric tile key.
     * use this at write-time or for legacy read paths outside the hot loop.
     *
     * @internal
     * @hidden
     */
    static quadkeyToKey(quadkey: string): number {
        // [z, y, x]
        const grid = tileUtils.quadToGrid(quadkey);
        return HeightMapTileCache.tileKey(grid[0], grid[2], grid[1]);
    }

    private static _ancestorTileXYZ = new Uint32Array(3);
    private static _tileXYZ = new Uint32Array(3);

    private static keyToXYZ(key: number, out: TileXYZ): TileXYZ {
        const z = Math.floor(key / 281474976710656);
        const remainder = key - z * 281474976710656;
        const x = Math.floor(remainder / 16777216);
        out[0] = x;
        out[1] = remainder - x * 16777216;
        out[2] = z;
        return out;
    }

    /**
     * computes the UV transform [offsetX, offsetY, scale] that maps the tile
     * identified by `tileKey` into the texture space of `ancestorKey`.
     *
     * `ancestorKey` must be an ancestor of - or equal to - `tileKey`.
     * For an identical key the result is the identity transform [0, 0, 1].
     *
     * @param ancestorKey - numeric key of the tile owning the heightmap texture
     * @param tileKey - numeric key of the tile to be mapped into that texture
     * @param out - optional target array, allocated when omitted
     */
    static computeTransform(ancestorKey: number, tileKey: number, out?: Float32Array): Float32Array {
        const ancestor = HeightMapTileCache.keyToXYZ(ancestorKey, this._ancestorTileXYZ);
        const tile = HeightMapTileCache.keyToXYZ(tileKey, this._tileXYZ);

        const deltaLevel = tile[2] - ancestor[2];
        // 2^deltaLevel as a float multiplier — avoids 32bit overflow of `<<` for large x/y.
        const tilesPerAncestor = Math.pow(2, deltaLevel);
        const scale = 1 / tilesPerAncestor;

        out ||= new Float32Array(3);
        out[0] = (tile[0] - ancestor[0] * tilesPerAncestor) * scale;
        out[1] = (tile[1] - ancestor[1] * tilesPerAncestor) * scale;
        out[2] = scale;
        return out;
    }

    static keyToQuadkey(key: number): string {
        const tileXYZ = HeightMapTileCache.keyToXYZ(key, HeightMapTileCache._tileXYZ);
        return tileUtils.tileXYToQuadKey(tileXYZ[2], tileXYZ[1], tileXYZ[0]);
    }

    get size(): number {
        return this.data.size;
    }

    init(tileSize: number, padding: number = 1) {
        this.tileSize = tileSize;
        this.padding = padding;
        this.data.clear();
        this.incVersion();
    }

    set(quadkey: string, value: HeightMapTileData): this {
        this.data.set(HeightMapTileCache.quadkeyToKey(quadkey), value);
        this.incVersion();
        return this;
    }

    setByTile(zoom: number, x: number, y: number, value: HeightMapTileData): this {
        this.data.set(HeightMapTileCache.tileKey(zoom, x, y), value);
        this.incVersion();
        return this;
    }

    get(quadkey: string): HeightMapTileData | undefined {
        return this.data.get(HeightMapTileCache.quadkeyToKey(quadkey));
    }

    getByTile(zoom: number, x: number, y: number): HeightMapTileData | undefined {
        return this.data.get(HeightMapTileCache.tileKey(zoom, x, y));
    }

    // direct lookup by pre-computed numeric key
    getByKey(key: number): HeightMapTileData | undefined {
        return this.data.get(key);
    }

    /**
     * Finds the nearest cached ancestor of the given tile, walking up the tile
     * pyramid with integer arithmetic only (no intermediate quadkey strings).
     *
     * The start tile itself is not considered — use {@link getByKey} for that.
     *
     * @param key - numeric tile key to start the upward walk from
     * @returns the ancestor's numeric tile key, or -1 when no ancestor is cached.
     */
    findAncestorKey(key: number): number {
        const tile = HeightMapTileCache.keyToXYZ(key, HeightMapTileCache._tileXYZ);
        let x = tile[0];
        let y = tile[1];
        let z = tile[2];
        while (z > 0) {
            z--;
            x = Math.floor(x / 2);
            y = Math.floor(y / 2);

            const ancestorKey = HeightMapTileCache.tileKey(z, x, y);
            if (this.data.has(ancestorKey)) {
                return ancestorKey;
            }
        }
        return -1;
    }

    has(quadkey: string): boolean {
        return this.data.has(HeightMapTileCache.quadkeyToKey(quadkey));
    }

    delete(key: string): boolean {
        const numKey = HeightMapTileCache.quadkeyToKey(key);
        const item = this.data.get(numKey);
        if (item) {
            item.texture?.destroy();
            item.offscreenOverlayTexture?.destroy();
            this.incVersion();
            return this.data.delete(numKey);
        }
        return false;
    }

    clear(): void {
        this.data.clear();
        this.incVersion();
    }

    forEach(callbackfn: (value: HeightMapTileData, key: number) => void): void {
        this.data.forEach(callbackfn);
    }

    values(): IterableIterator<HeightMapTileData> {
        return this.data.values();
    }

    initEmptyTexture(device: GraphicsDevice) {
        const size = 1 + this.tilePadding;
        this.emptyTexture = new Texture(device, {
            data: new Float32Array(size * size),
            width: size,
            height: size
        });
    }

    getEmptyTexture(): Texture {
        return this.emptyTexture;
    }
}
