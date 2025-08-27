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
import {GeometryBuffer} from './buffer/GeometryBuffer';
import {Layer} from '../Layers';
import {ViewportTile} from '../BasicDisplay';
import {create, identity, invert, multiply} from 'gl-matrix/mat4';
import {transformMat4} from 'gl-matrix/vec3';

export type ViewportTileData = {
    tile: ViewportTile;
    preview?: [string, number, number, number, number, number, number, number, number];
    stencils?;
};

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

    constructor(buffer?: GeometryBuffer, z?: number, data?: ViewportTileData, layer?: Layer) {
        this._modelMatrix = create();
        this._mvpMatrix = create();
        this._invModelMatrix = create();
        this.init(buffer, z, data, layer);
    }

    init(buffer: GeometryBuffer, z?: number, data?: ViewportTileData, layer?: Layer) {
        this.buffer = buffer;
        this.z = z;
        this.data = data;
        this.layer = layer;

        identity(this._modelMatrix);
        this._mmUpdated = false;
        this._mvpUpdated = false;
        this._iMMUpdate = true;
    }

    reset() {
        this.buffer = null;
        this.data = null;
        this.layer = null;
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
        const p = [worldX, worldY, worldZ||0];
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
};


export class RenderTilePool {
    private pool: RenderTile[] = [];
    private index = 0;

    private lastClearedIndex: number;

    beginFrame() {
        this.index = 0;
    }

    getNext(): RenderTile {
        if (this.index >= this.pool.length) {
            this.pool.push(new RenderTile());
        }
        const node = this.pool[this.index++];

        return node;
    }
    /**
     * Resets all RenderTiles that were not used in the current frame but were
     * potentially used in the previous frame. This allows releasing references
     * and helps garbage collection by avoiding unnecessary repeated resets.
     */
    endFrame() {
        for (let i = this.index; i < this.lastClearedIndex; i++) {
            this.pool[i].reset();
        }
        this.lastClearedIndex = this.index;
    }

    getUsedNodes(): RenderTile[] {
        return this.pool.slice(0, this.index);
    }
}
