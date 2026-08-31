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
import {Task, TaskOptions} from '@here/xyz-maps-common';
import {TerrainTileLayer, tileUtils} from '@here/xyz-maps-core';
import {GeometryBuffer} from '../GeometryBuffer';
import GLTile from '../../GLTile';
import {Texture} from '../../Texture';
import {TilePreviewInfo} from '../../../Preview';
import {HeightMapTileCache, HeightMapTileData} from '../../HeightMapTileCache';
import {Layer} from '../../../Layers';
import {GraphicsDevice} from '../../device/GraphicsDevice';

type TerrainTaskInput = {
    buffers: GeometryBuffer[]
}

type TerrainTaskData = TerrainTaskInput & {
    bufferIndex: number;
    heightMapIndex: number;
    heightMapSize: number;
    min: number;
    max: number;
    heightMap: Float32Array
};

type HeightMapData = GeometryBuffer['heightMap'];

export class TerrainTask extends Task<TerrainTaskInput, TerrainTaskData, HeightMapData> {
    name = 'TerrainTask';
    time = 2;

    private terrainCache: HeightMapTileCache;

    private tile: GLTile;
    private tileZ: number;
    private tileX: number;
    private tileY: number;
    private terrainLayer: Layer;
    private device: GraphicsDevice;

    private heightMap: HeightMapData;
    private padding: number;


    // true when a cached ancestor is referenced instead of creating a local copy.
    private referenceAncestor: boolean;
    // tile key whose coordinate space contains the geometry vertices.
    private geometryTileKey: number;
    // terrain tile key to sample (clamped to maxDataZoom)
    private terrainTileKey: number;
    // maps geometryTileKey into terrainTileKey (null when both keys are equal)
    private terrainTransform: Float32Array | null;

    constructor(options: TaskOptions & {
        device: GraphicsDevice,
        displayTile: GLTile,
        terrainLayer: Layer,
        terrainCache: HeightMapTileCache
    }) {
        super(options);

        this.device = options.device;
        this.tile = options.displayTile;
        this.terrainCache = options.terrainCache;
        this.terrainLayer = options.terrainLayer;
        const terrainTileLayer = this.terrainLayer?.layer as TerrainTileLayer;
        this.padding = terrainTileLayer?.getHeightmapPadding();

        const [zoom, y, x] = tileUtils.quadToGrid(this.tile.quadkey);

        this.tileZ = zoom;
        this.tileX = x;
        this.tileY = y;

        this.geometryTileKey = HeightMapTileCache.tileKey(zoom, x, y);
        this.terrainTileKey = this.geometryTileKey;
        this.terrainTransform = null;

        const maxDataZoom = terrainTileLayer?.maxDataZoom;
        if (typeof maxDataZoom === 'number' && zoom > maxDataZoom) {
            const tilesPerTerrainTile = Math.pow(2, zoom - maxDataZoom);
            this.terrainTileKey = HeightMapTileCache.tileKey(
                maxDataZoom,
                Math.floor(x / tilesPerTerrainTile),
                Math.floor(y / tilesPerTerrainTile)
            );
            this.terrainTransform = HeightMapTileCache.computeTransform(this.terrainTileKey, this.geometryTileKey);
        }
    }

    private blitHeightmap(
        source: Float32Array,
        target: Float32Array,
        hmWidth: number,
        sx = 0,
        sy = 0,
        sWidth: number,
        dx = 0,
        dy = 0,
        dWidth: number
    ) {
        const pad = this.padding;

        const destStartX = Math.max(0, Math.floor(dx));
        const destStartY = Math.max(0, Math.floor(dy));
        const destEndX = Math.min(hmWidth - 1, Math.floor(dx + dWidth));
        const destEndY = Math.min(hmWidth - 1, Math.floor(dy + dWidth));

        const scaleX = (sWidth - 1) / (dWidth - 1);
        const scaleY = (sWidth - 1) / (dWidth - 1);

        for (let y = destStartY; y <= destEndY; y++) {
            const srcYFloat = sy + (y - dy) * scaleY;
            const srcY = Math.min(hmWidth - 1, Math.max(pad, Math.round(srcYFloat)));
            const srcRow = srcY * hmWidth;
            const targetRow = y * hmWidth;

            for (let x = destStartX; x <= destEndX; x++) {
                const srcXFloat = sx + (x - dx) * scaleX;
                const srcX = Math.min(hmWidth - 1, Math.max(pad, Math.round(srcXFloat)));

                target[targetRow + x] = source[srcRow + srcX];
            }
        }
    }

    private fillPaddingRing(data: Float32Array, size: number) {
        const pad = this.padding;
        if (pad <= 0) return;

        const last = size - 1;
        for (let i = pad; i < size - pad; i++) {
            for (let p = 0; p < pad; p++) {
                data[p * size + i] = data[pad * size + i]; // top
                data[(last - p) * size + i] = data[(last - pad) * size + i]; // bottom
                data[i * size + p] = data[i * size + pad]; // left
                data[i * size + last - p] = data[i * size + last - pad]; // right
            }
        }
        for (let py = 0; py < pad; py++) {
            for (let px = 0; px < pad; px++) {
                data[py * size + px] = data[pad * size + pad]; // top-left
                data[py * size + last - px] = data[pad * size + last - pad]; // top-right
                data[(last - py) * size + px] = data[(last - pad) * size + pad]; // bottom-left
                data[(last - py) * size + last - px] = data[(last - pad) * size + last - pad]; // bottom-right
            }
        }
    }

    /**
     * Blits the next preview source into the local heightmap.
     * Finalizes and stores the heightmap after the last source.
     *
     * @returns true when all sources are processed.
     *
     * @internal
     * @hidden
     */
    private blitPreviewHeightMap(data: TerrainTaskData, preview: TilePreviewInfo[]): boolean {
        const cachedTerrainData = this.terrainCache.getByTile(this.tileZ, this.tileX, this.tileY) || ({} as HeightMapTileData);
        const heightMapInfo = preview[data.heightMapIndex];
        // heightMapInfo[0] is a quadkey from the preview system
        const heightMapData = this.terrainCache.get(heightMapInfo[0] as string);
        const heightMap = heightMapData?.data;
        const heightMapSize = Math.sqrt(heightMap?.length) || data.heightMapSize;
        const heightMapTileSize = heightMapSize - 1 - 2 * this.padding;
        // Ratio of logical tile pixels to usable heightmap pixels (inner area without padding).
        const tileToHeightmapPixelScale = heightMapTileSize / this.terrainLayer.tileSize;
        const target = data.heightMap ||= new Float32Array(heightMapSize * heightMapSize);

        if (heightMap) {
            if (heightMapData.min < data.min) {
                data.min = heightMapData.min;
            }
            if (heightMapData.max > data.max) {
                data.max = heightMapData.max;
            }

            // Preview coordinates are expressed in the logical tile area. The
            // heightmap data is stored in a physically padded texture, so both
            // source and destination coordinates need to skip the padding ring.
            const padding = this.padding;
            this.blitHeightmap(heightMap, target, heightMapSize,
                heightMapInfo[1] * tileToHeightmapPixelScale + padding,
                heightMapInfo[2] * tileToHeightmapPixelScale + padding,
                heightMapInfo[3] * tileToHeightmapPixelScale,
                heightMapInfo[5] * tileToHeightmapPixelScale + padding,
                heightMapInfo[6] * tileToHeightmapPixelScale + padding,
                heightMapInfo[7] * tileToHeightmapPixelScale
            );
        }

        if (++data.heightMapIndex < preview.length) {
            return false;
        }

        // all preview heightmaps processed — fill padding ring from edge values
        this.fillPaddingRing(target, heightMapSize);

        const heightMapTexture = new Texture(this.device, {
            data: target,
            width: heightMapSize,
            height: heightMapSize
        });
        // Use accumulated stats from all sources.
        // fall back to 0 if none are valid.
        const hasStats = Number.isFinite(data.min);
        this.heightMap = {
            ...cachedTerrainData,
            data: target,
            size: heightMapSize,
            texture: heightMapTexture,
            tileSize: this.terrainLayer.tileSize,
            padding: this.padding,
            min: hasStats ? data.min : 0,
            max: hasStats ? data.max : 0
        };

        data.heightMap = null;
        data.heightMapIndex = 0;
        data.min = Infinity;
        data.max = -Infinity;

        return true;
    }

    /**
     * Returns whether a single cached ancestor heightmap can be sampled directly
     * via UV transform instead of creating a local copy.
     *
     * @internal
     * @hidden
     */
    private canReferenceAncestor(preview: TilePreviewInfo[]): boolean {
        if (preview.length !== 1) return false;
        const quadkey = this.tile.quadkey;
        // preview[n][0] is the quadkey of the preview source tile
        const sourceQuadkey = preview[0][0] as string;
        // Only prefix ancestors map onto a single contiguous UV sub-region.
        return quadkey.startsWith(sourceQuadkey) && !!this.terrainCache.get(sourceQuadkey)?.data;
    }

    override init(data: TerrainTaskInput): TerrainTaskData {
        this.heightMap = null;
        this.referenceAncestor = false;

        for (let buffer of data.buffers) {
            if (buffer.heightMapRef === 'required') {
                buffer.terrainCache = this.terrainCache;
            }
        }
        return {
            buffers: data.buffers,
            bufferIndex: 0,
            heightMapIndex: 0,
            min: Infinity,
            max: -Infinity,
            heightMap: null,
            heightMapSize: this.terrainLayer?.tileSize + 1 + 2 * this.padding
        };
    }

    override exec(data: TerrainTaskData): boolean {
        if (!this.terrainLayer) return;

        const buffers = data.buffers;

        while (data.bufferIndex < buffers.length) {
            const buffer = buffers[data.bufferIndex];

            if (buffer.heightMap) {
                // Capture direct heightmap data for caching; check before heightMapRef.
                this.heightMap = buffer.heightMap;
            } else if (buffer.heightMapRef === 'required') {
                const cachedTerrainData = this.terrainCache.getByTile(this.tileZ, this.tileX, this.tileY) || ({} as HeightMapTileData);
                const heightMapData = cachedTerrainData.data ? cachedTerrainData : this.heightMap;

                if (!heightMapData && !this.referenceAncestor) {
                    const preview: TilePreviewInfo[] = this.tile.preview(this.terrainLayer.index) as TilePreviewInfo[];

                    if (!preview?.length) return;

                    if (this.canReferenceAncestor(preview)) {
                        // Use the cached ancestor via UV transform until this tile is available.
                        this.referenceAncestor = true;
                    } else if (!this.blitPreviewHeightMap(data, preview)) {
                        // Materialize a local copy when one texture cannot represent the preview.
                        return this.CONTINUE;
                    }
                }

                buffer.heightMapRef = {
                    terrainTileKey: this.terrainTileKey,
                    geometryTileKey: this.geometryTileKey,
                    transform: this.terrainTransform
                };
            }
            return ++data.bufferIndex < buffers.length ? this.CONTINUE : this.BREAK;
        }
    }

    override onDone(data): HeightMapData {
        const heightMap = this.heightMap;
        this.heightMap = null;

        return heightMap;
    }
}
