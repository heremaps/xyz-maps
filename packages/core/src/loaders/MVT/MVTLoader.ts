/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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

import {FeatureLayerMap, XYZBin} from './XYZBin';
import WorkerHTTPLoader from '../webworker/HTTPLoader';

export type ProcessedMvtResult = { mvt: any, triangles: FeatureLayerMap };

class MVTTileLoader extends WorkerHTTPLoader {
    constructor(options) {
        super('MVTWorker', options);
    }

    protected processData(data: any): ProcessedMvtResult {
        // console.time('mvt-decode');
        const xyzBin = new XYZBin(data.triangles);
        const layers = xyzBin.getLayers();
        const triangles = {};

        for (let i in layers) {
            triangles[i] = xyzBin.getFeatures(layers[i]);
        }
        // console.timeEnd('mvt-decode');
        return {
            mvt: data.mvt,
            triangles
        };
    }
}

export default MVTTileLoader;
