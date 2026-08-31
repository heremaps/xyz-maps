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
import {GeometryBuffer, HeightMapReference} from './buffer/GeometryBuffer';
import {HeightMapTileCache} from './HeightMapTileCache';
import {Layer} from '../Layers';
import {DisplayTile, ViewportTile} from '../BasicDisplay';
import {create, identity, invert, multiply} from 'gl-matrix/mat4';
import {transformMat4} from 'gl-matrix/vec3';
import {PASS} from './RenderPass';
import {TilePreviewInfo} from '../Preview';
import {TileLayer, TerrainTileLayer} from '@here/xyz-maps-core';
import {nextFrame as nextPerfFrame} from './PerfTimer';
import {TerrainOcclusionMode} from './buffer/TerrainRenderPolicy';

export type ViewportTileData = {
    tile: DisplayTile;
    // preview?: [string, number, number, number, number, number, number, number, number];
    preview?: TilePreviewInfo;
    stencils?;
    // Tte quadkey of the actual terrain tile covering this screen tile.
    // for non-preview terrain: derived from screen tile quadkey (adjusted for deltaLevel).
    // for preview terrain: the preview source quadkey (e.g. z15 parent when zooming into z16).
    terrainTileQuadkey?: string;
};

export enum RenderTileTarget {
    Display = 0,
    OffscreenTerrain = 1
}


export class RenderTile {
    z: number;
    tiled: true = true;
    buffer: GeometryBuffer;
    layer: Layer;
    data: ViewportTileData;

    private _modelMatrix: Float32Array;
    private _invModelMatrix: Float32Array;
    private _mmUpdated: boolean;
    private _mvpMatrix: Float32Array;
    private _mvpUpdated: boolean;
    private _iMMUpdate: boolean;

    pool?: RenderTilePool;
    pass: PASS;
    renderTarget: RenderTileTarget;

    disableDepthTestOver3D: boolean;

    constructor(buffer?: GeometryBuffer, z?: number, data?: ViewportTileData, pass: PASS = buffer?.pass, layer?: Layer) {
        // this.id = `RT-${id++}`;
        this._modelMatrix = create();
        this._mvpMatrix = create();
        this._invModelMatrix = create();
        this.init(buffer, z, data, pass || 0, layer);
    }

    init(
        buffer: GeometryBuffer,
        z?: number,
        data?: ViewportTileData,
        pass: PASS = buffer.pass,
        layer?: Layer
    ): RenderTile {
        this.buffer = buffer;
        this.z = z;

        this.layer = layer;
        identity(this._modelMatrix);
        this._mmUpdated = false;
        this._mvpUpdated = false;
        this._iMMUpdate = true;

        this.pass = pass;
        this.data = data;

        this.renderTarget = RenderTileTarget.Display;

        this.disableDepthTestOver3D = false;

        return this;
    }

    reset() {
        this.buffer = null;
        this.data = null;
        this.layer = null;
    }

    getTileSize(): number {
        return this.data?.tile.renderTileSize ?? this.layer?.tileSize ?? 1;
    }

    getModelMatrix() {
        return this._modelMatrix;
    }

    getInverseModelMatrix() {
        if (this._iMMUpdate) {
            this._iMMUpdate = false;
            invert(this._invModelMatrix, this._modelMatrix);
        }
        return this._invModelMatrix;
    }

    worldToTile(worldX: number, worldY: number, worldZ?: number): [number, number, number] {
        const p = [worldX, worldY, worldZ || 0];
        return transformMat4(p, p, this.getInverseModelMatrix());
    }

    updateMVPMatrix(vpMatrix: Float32Array) {
        if (!this._mmUpdated) {
            return vpMatrix;
        }
        if (this._mvpUpdated) {
            return this._mvpMatrix;
        }
        this._mvpUpdated = true;

        return multiply(this._mvpMatrix, vpMatrix, this._modelMatrix);
    }

    applyViewportTileTransform(
        screenTile: { x: number, y: number, worldTileSize: number } = this.data.tile,
        forceUpdate?: boolean
    ): number {
        const renderTile = this;
        // const screenTile = renderTile.data.tile;
        const {preview} = renderTile.data;
        let {x, y, worldTileSize} = screenTile;
        let distanceScale = worldTileSize / renderTile.layer.tileSize;
        // console.log('*** applyViewportTileTransform', worldTileSize, '->', distanceScale);

        if (preview) {
            // const [, sx, sy, sWidth, , dx, dy, dWidth] = preview;
            // const previewScale = dWidth / sWidth;
            const previewScale = preview[7] / preview[3];
            // const previewOffsetX = dx - sx * previewScale;
            const previewOffsetX = preview[5] - preview[1] * previewScale;
            // const previewOffsetY = dy - sy * previewScale;
            const previewOffsetY = preview[6] - preview[2] * previewScale;
            x += previewOffsetX * distanceScale;
            y += previewOffsetY * distanceScale;
            distanceScale *= previewScale;
            // const scale = previewScale * distanceScale;
            // renderTile.setTransform(tx, ty, distanceScale);
        }
        if (forceUpdate) {
            this._mmUpdated = false;
            this._mvpUpdated = false;
            this._iMMUpdate = true;
        }
        renderTile.setTransform(x, y, distanceScale);
        return distanceScale;
    }

    setTransform(tx: number, ty: number, s: number) {
        if (!this._mmUpdated) {
            this._mmUpdated = true;
            this._iMMUpdate = true;
            const modelMatrix = this._modelMatrix;

            modelMatrix[12] = tx;
            modelMatrix[13] = ty;
            modelMatrix[0] = s;
            modelMatrix[5] = s;
            // translate(modelMatrix, modelMatrix, [tx, ty, 0]);
            // scale(modelMatrix, modelMatrix, [s, s, 1]);
        }
        return this._modelMatrix;
    }

    private _transform: { tx: number, ty: number, s: number } = {tx: 0, ty: 0, s: 1};

    getTransform(): { readonly tx: number, readonly ty: number, readonly s: number } {
        const modelMatrix = this._modelMatrix;
        const transform = this._transform;
        transform.tx = modelMatrix[12];
        transform.ty = modelMatrix[13];
        transform.s = modelMatrix[0];
        return transform;
    }


    prepareHeightMapReferences() {
        const geometryBuffer = this.buffer;
        const terrainLayer = this.layer.getTerrainLayer();
        const ref = geometryBuffer.heightMapRef;
        const cache = geometryBuffer.terrainCache;

        if (!terrainLayer || !ref || !cache) {
            geometryBuffer.resolvedHeightMap = null;
            geometryBuffer.resolvedHeightMapTransform = null;
            return;
        }

        if (ref === 'required') {
            // first-time resolve for buffers that never went through TerrainTask: derive a
            // stable target key from the screen tile's quadkey, clamped to maxDataZoom.
            const dataQuadkey = this.data.tile.quadkey;
            const maxDataZoom = (terrainLayer.layer as TileLayer).maxDataZoom;
            const geometryTileKey = HeightMapTileCache.quadkeyToKey(dataQuadkey);

            let terrainTileKey = geometryTileKey;
            let transform: Float32Array = null;

            if (dataQuadkey.length > maxDataZoom) {
                terrainTileKey = HeightMapTileCache.quadkeyToKey(dataQuadkey.substring(0, maxDataZoom));
                transform = HeightMapTileCache.computeTransform(terrainTileKey, geometryTileKey);
            }
            geometryBuffer.heightMapRef = {terrainTileKey, geometryTileKey, transform};
        }

        geometryBuffer.resolveHeightMap();
    }

    needsOffscreenPass(): boolean {
        return this.renderTarget === RenderTileTarget.OffscreenTerrain && this.layer.getTerrainLayer() != null;
        // return this.buffer?.needsOffscreenPass(this.data.tile);
    }

    isTerrainOcclusionCandidate(): boolean {
        return this.buffer?.terrainOcclusion === TerrainOcclusionMode.TERRAIN;
    }
};


export class RenderTilePool {
    private pool: RenderTile[] = [];
    private index = 0;

    private lastClearedIndex: number;

    beginFrame() {
        this.index = 0;
        // for (let i = this.index; i < this.lastClearedIndex; i++) {
        // this.pool[i].reset();
        // }
    }

    getNext(): RenderTile {
        if (this.index >= this.pool.length) {
            const rt = new RenderTile();
            rt.pool = this;
            this.pool.push(rt);
        }
        return this.pool[this.index++];
    }

    endFrame() {
        // resets all RenderTiles that were not used in the current frame but were used in the previous frame.
        for (let i = this.index; i < this.lastClearedIndex; i++) {
            this.pool[i].reset();
        }
        this.lastClearedIndex = this.index;
        nextPerfFrame();
    }

    getUsedNodes(): RenderTile[] {
        return this.pool.slice(0, this.index);
    }
}
