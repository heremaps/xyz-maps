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

import {GeoJSONFeature} from '../../features/GeoJSON';
import TileProvider from '../TileProvider/TileProvider';
import Tile from '../../tile/Tile';

let UNDEF;

const isFnc = (fnc) => typeof fnc === 'function';

const isPromise = (p) => p && (typeof p == 'object' || typeof p == 'function') && typeof p.then == 'function';

export type PostProcesserInput = { put?: GeoJSONFeature[], remove?: GeoJSONFeature[] };

export type PostProcessor = (CommitData) => PostProcesserInput;

export type ProcessorInput = {
    data: any[] | PostProcesserInput;
    provider: TileProvider;
    ready: (data: GeoJSONFeature[]) => void;
    tile?: {
        x: number;
        y: number;
        z: number;
    }
}

export type PreProcessor = (data: ProcessorInput) => GeoJSONFeature[];

export const isPreprocessor = (preprocessor) => {
    return isFnc(preprocessor);
};

export const isPostprocessor = (postprocessor) => {
    return isFnc(postprocessor);
};

export const executeProcessor = (processor, data: any = {}) => {
    let callback = data.ready;
    let processedData;

    if (isPreprocessor(processor)) {
        processedData = processor(data);
    } else {
        processedData = data.data;
    }

    if (isPromise(processedData)) {
        processedData.then(callback);
    } else if (processedData !== UNDEF) {
        callback(processedData);
    }
};

export const createRemoteProcessor = (preprocessor: PreProcessor) => function(
    data: any[] | PostProcesserInput,
    ready,
    tile?: Tile
) {
    const processorInput: ProcessorInput = {
        data: data,
        provider: <TileProvider> this,
        ready: ready
    };

    if (tile) {
        processorInput.tile = {
            x: tile.x,
            y: tile.y,
            z: tile.z
        };
    }
    executeProcessor(preprocessor, processorInput);
};
