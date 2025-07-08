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
}

class TerrainTileLoader extends WorkerHTTPLoader {
    private min: number;
    private max: number;

    constructor(options: TerrainTileLoaderOptions) {
        super('TerrainWorker', options);

        this.min = options.min ?? 0;
        this.max = options.min ?? 30;
    }

    protected processData(data: any): any {
        return data;
    }

    load(tile, success, error?) {
        if (tile.quadkey.length < this.min) {
            const flatTerrain = createTerrainTile(tile.x, tile.y, tile.z,
                new Uint16Array([0, 1, 3, 1, 2, 3]),
                new Uint8Array([0, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 0]),
                new Int8Array([0, 0, 127, 0, 0, 127, 0, 0, 127, 0, 0, 127]),
                {
                    quantizedRange: 255,
                    quantizedMinHeight: 0,
                    quantizedMaxHeight: 255
                }
            );
            flatTerrain.properties.dummy = true;
            return success(flatTerrain);
        }
        super.load(tile, success, error);
    }
}

export default TerrainTileLoader;
