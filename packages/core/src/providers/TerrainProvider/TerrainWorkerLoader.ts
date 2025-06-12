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


export interface TerrainImageryLoaderOptions extends HTTPLoaderOptions {
    attribution?: DataSourceAttribution | DataSourceAttribution[] | string;
}
export interface TerrainTileLoaderOptions extends HTTPLoaderOptions {
    encoding?: string;
    heightScale?: number;
    heightOffset?: number;
    maxGeometricError?: StyleZoomRange<number>;
    attribution?: DataSourceAttribution | DataSourceAttribution[] | string;
}

class TerrainTileLoader extends WorkerHTTPLoader {
    constructor(options: TerrainTileLoaderOptions) {
        super('TerrainWorker', options);
    }
    protected processData(data: any): any {
        return data;
    }
}

export default TerrainTileLoader;
