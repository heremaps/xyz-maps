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
import {TerrainTileLayer} from '@here/xyz-maps-core';
import {GeometryBuffer} from '../GeometryBuffer';
import GLTile from '../../GLTile';
import {Texture} from '../../Texture';
import {TilePreviewInfo} from '../../../Preview';
import {HeightMapTileCache} from '../../HeightMapTileCache';
import {Layer} from '../../../Layers';

type TerrainTaskInput = {
    buffers: GeometryBuffer[]
}

type TerrainTaskData = TerrainTaskInput & {
    bufferIndex: number;
    heightMapIndex: number;
    heightMapSize: number,
    heightMap: Float32Array
};

type HeightMapData = GeometryBuffer['heightMap'];

export class TerrainTask extends Task<TerrainTaskInput, TerrainTaskData, HeightMapData> {
    name = 'TerrainTask';
    time = 2;

    private terrainCache: HeightMapTileCache;

    private tile: GLTile;
    private terrainLayer: Layer;
    private gl: WebGLRenderingContext;

    private heightMap: HeightMapData;
    private padding: number;

    constructor(options: TaskOptions & {
        gl: WebGLRenderingContext,
        displayTile: GLTile,
        terrainLayer: Layer,
        terrainCache: HeightMapTileCache
    }) {
        super(options);

        this.gl = options.gl;
        this.tile = options.displayTile;
        this.terrainCache = options.terrainCache;
        this.terrainLayer = options.terrainLayer;
        const terrainTileLayer = this.terrainLayer?.layer as TerrainTileLayer;
        this.padding = terrainTileLayer?.getHeightmapPadding();
    }

    private blitHeightmap(
        source: Float32Array, target: Float32Array, hmWidth: number,
        sx: number = 0, sy: number = 0, sWidth: number,
        dx: number = 0, dy: number = 0, dWidth: number
    ) {
        const pad = this.padding;
        // usable area of the source excluding padding
        const innerWidth = hmWidth - 2 * pad;
        const tileSize = this.terrainLayer.tileSize;
        // scale from source heightmap to tile resolution (even width)
        const hmScale = (innerWidth - (innerWidth & 1)) / tileSize;
        // scale between source region and destination region
        const scaleXY = sWidth / dWidth;
        // start positions in source incl. padding
        const srcOffsetX = sx * hmScale + pad;
        const srcOffsetY = sy * hmScale + pad;
        // if downscaling ensure the last pixel gets copied
        // const targetWidth = scaleXY < 1 ? dWidth + 1 : dWidth;
        // // target end: always fill up to hmWidth (heightmap width) (computed but not explicitly used)
        // const dEndX = dx + targetWidth * hmScale;
        // const dEndY = dy + targetWidth * hmScale;
        for (let y = Math.floor(dy); y < hmWidth; y++) {
            const srcYf = srcOffsetY + (y - dy) * scaleXY;
            const srcY = Math.min(innerWidth - 1 + pad, srcYf | 0) * hmWidth;
            const targetRow = y * hmWidth;

            for (let x = Math.floor(dx); x < hmWidth; x++) {
                const srcXf = srcOffsetX + (x - dx) * scaleXY;
                const srcX = Math.min(innerWidth - 1 + pad, srcXf | 0);
                target[targetRow + x] = source[srcY + srcX];
            }
        }
    }

    override init(data: TerrainTaskInput): TerrainTaskData {
        this.heightMap = null;
        return {
            buffers: data.buffers,
            bufferIndex: 0,
            heightMapIndex: 0,
            heightMap: null,
            heightMapSize: this.terrainLayer?.tileSize + 1 // + 2
        };
    }

    override exec(data: TerrainTaskData): boolean {
        if (!this.terrainLayer) return;

        const buffers = data.buffers;

        while (data.bufferIndex < buffers.length) {
            const buffer = buffers[data.bufferIndex];

            let cacheKey = this.tile.quadkey;


            if (buffer.heightMapRef === 'required') {
                const heightMapData = this.terrainCache.get(cacheKey) || this.heightMap;

                if (!heightMapData) {
                    const preview: TilePreviewInfo[] = this.tile.preview(this.terrainLayer.index) as TilePreviewInfo[];
                    if (!preview?.length) return;

                    const heightMapInfo = preview[data.heightMapIndex];
                    const heightMap = this.terrainCache.get(heightMapInfo[0])?.data;
                    const heightMapSize = Math.sqrt(heightMap?.length) || data.heightMapSize;
                    const heightMapTileSize = heightMapSize - 1 - 2 * this.padding;
                    // Ratio of logical tile pixels to usable heightmap pixels (inner area without padding).
                    const tileToHeightmapPixelScale = heightMapTileSize / (this.terrainLayer.tileSize);
                    const target = data.heightMap ||= new Float32Array(heightMapSize * heightMapSize);

                    if (heightMap) {
                        this.blitHeightmap(heightMap, target, heightMapSize,
                            heightMapInfo[1] * tileToHeightmapPixelScale,
                            heightMapInfo[2] * tileToHeightmapPixelScale,
                            heightMapInfo[3] * tileToHeightmapPixelScale,
                            heightMapInfo[5] * tileToHeightmapPixelScale,
                            heightMapInfo[6] * tileToHeightmapPixelScale,
                            heightMapInfo[7] * tileToHeightmapPixelScale
                        );
                    }


                    if (++data.heightMapIndex < preview.length) {
                        return this.CONTINUE;
                    } else {
                        // all preview heightmaps processed
                        const heightMapTexture = new Texture(this.gl, {
                            data: target,
                            width: heightMapSize,
                            height: heightMapSize
                        });
                        this.heightMap = {
                            data: target,
                            size: heightMapSize,
                            texture: heightMapTexture,
                            tileSize: this.terrainLayer.tileSize
                        };
                        // printHeightMap(target, this.padding);
                        data.heightMap = null;
                        data.heightMapIndex = 0;
                    }
                }
                buffer.terrainCache = this.terrainCache;
                buffer.heightMapRef = cacheKey;
            } else if (buffer.heightMap) {
                this.heightMap = buffer.heightMap;
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
