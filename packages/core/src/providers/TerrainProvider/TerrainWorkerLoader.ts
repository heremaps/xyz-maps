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

import WorkerHTTPLoader from '../../loaders/webworker/HTTPLoader';
import {HTTPLoaderOptions} from '../../loaders/HTTPLoader';
import {StyleZoomRange} from '../../styles/LayerStyle';

import {DataSourceAttribution} from '../../layers/DataSourceAttribution';
import {createTerrainTile} from './TerrainWorker';


export interface TerrainImageryLoaderOptions extends HTTPLoaderOptions {
    attribution?: DataSourceAttribution | DataSourceAttribution[] | string;
}

export interface TerrainTileLoaderOptions extends HTTPLoaderOptions {
    encoding?: string;
    heightScale?: number;
    heightOffset?: number;
    maxGeometricError?: StyleZoomRange<number>;
    attribution?: DataSourceAttribution | DataSourceAttribution[] | string;
    min?: number;
    max?: number;
    heightMapPadding?: number;
}

const FLAT_TERRAIN_DATA = {
    indices: new Uint16Array([0, 1, 3, 1, 2, 3]),
    vertices: new Uint8Array([0, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 0]),
    normals: new Int8Array([0, 0, 127, 0, 0, 127, 0, 0, 127, 0, 0, 127]),
    quantizeOptions: {
        quantizedRange: 255,
        quantizedMinHeight: 0,
        quantizedMaxHeight: 255
    },
    heightMap: {data: new Float32Array(3 * 3), padding: 0}
};

class TerrainTileLoader extends WorkerHTTPLoader {
    private min: number;
    private max: number;

    constructor(options: TerrainTileLoaderOptions) {
        super('TerrainWorker', {heightMapPadding: 0, ...options});

        this.min = options.min ?? 0;
        this.max = options.min ?? 30;
    }

    protected processData(data: any): any {
        return data;
    }

    load(tile, success, error?) {
        if (tile.quadkey.length < this.min) {
            const flatTerrain = createTerrainTile(tile.x, tile.y, tile.z,
                FLAT_TERRAIN_DATA.indices,
                FLAT_TERRAIN_DATA.vertices,
                FLAT_TERRAIN_DATA.normals,
                FLAT_TERRAIN_DATA.quantizeOptions,
                FLAT_TERRAIN_DATA.heightMap
            );
            flatTerrain.properties.dummy = true;
            flatTerrain.properties.useHeightMap = true;
            return success(flatTerrain);
        }
        super.load(tile, success, error);
    }

    setMaxGeometricError(maxGeometricError: { [zoom: number]: number }) {
        this.call({method: 'setMaxGeometricError', data: maxGeometricError});
    }

    async createMeshFromHeightMap(data: {
        heightMap: Float32Array,
        error: number,
        centerLatitude: number,
        zoom: number
    }): Promise<{
        indices: Uint16Array | Uint32Array,
        vertices: Float32Array,
        heightMap: Float32Array,
        normals?: Float32Array
    }> {
        return this.call({
            method: 'createMeshFromHeightMap',
            key: `${data.zoom}:${data.centerLatitude}`,
            data,
            transfer: [data.heightMap.buffer]
        });
    }
}

export default TerrainTileLoader;
