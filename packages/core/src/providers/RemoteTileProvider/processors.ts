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
import type {ModelTextureData} from '../../styles/ModelStyle';

/**
 * Worker-safe helpers available to worker preprocessors.
 */
export interface WorkerPreProcessorUtils {
    /**
     * Decode standard base64 into bytes using native `atob` validation.
     * ASCII whitespace and omitted padding are accepted; invalid alphabet or
     * padding throws. This does not decode text or accept base64url.
     */
    decodeBase64(encoded: string): Uint8Array;
    /**
     * Decompress bytes using native `DecompressionStream`, preserving the input.
     * Rejects for malformed data, unsupported formats, or unavailable native APIs.
     * No base64/text detection or fallback is performed.
     */
    decompress(bytes: Uint8Array, format: 'gzip' | 'deflate' | 'deflate-raw'): Promise<Uint8Array>;
    /**
     * Decode an uncompressed or RLE-compressed 24/32-bit truecolor TGA image
     * into {@link ModelTextureData}, with bottom-to-top RGBA rows and `flipY: false`.
     * Throws an Error for invalid or unsupported input.
     */
    decodeTga(bytes: Uint8Array): ModelTextureData;
}

/**
 * Context received as the worker preprocessor's second argument.
 */
export interface WorkerPreProcessorContext {
    /**
     * Configured structured-cloneable options, or an empty object when omitted.
     */
    options: Record<string, unknown>;
    /**
     * Utilities for preparing feature data in the worker.
     *
     * @remarks
     * The full XYZ Maps API is not available in the worker.
     */
    utils: WorkerPreProcessorUtils;
}

/**
 * Input received by a worker preprocessor.
 *
 */
export interface WorkerPreProcessorInput {
    data: GeoJSONFeature[];
    tile: {
        x: number;
        y: number;
        z: number;
        quadkey: string;
    };
}

/**
 * Standalone preprocessor function that can be serialized into the worker.
 *
 */
export type WorkerPreProcessorFunction = (
    input: WorkerPreProcessorInput,
    context: WorkerPreProcessorContext
) => GeoJSONFeature[] | Promise<GeoJSONFeature[]>;

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
        quadkey: string;
    }
}

/**
 * Main-thread preprocessor, including Promise and legacy callback completion.
 * Receives loaded features, the provider, and optional tile coordinates.
 * Return the processed features or call `ready(features)` when returning void.
 *
 */
export type PreProcessor = (input: Omit<ProcessorInput, 'data'> & {
    data: any[];
}) => GeoJSONFeature[] | Promise<GeoJSONFeature[]> | void;

export const isPreprocessor = (preprocessor) => {
    return isFnc(preprocessor);
};

export const isPostprocessor = (postprocessor) => {
    return isFnc(postprocessor);
};

/**
 * Execute one stage, completing once via callback, return value, or Promise.
 *
 * @internal
 * @hidden
 */
export const executeProcessor = (processor, data: any = {}, onError?: (error: any) => void) => {
    let completed = false;
    const complete = (result) => {
        if (completed) return;
        completed = true;
        return data.ready(result);
    };
    const fail = (error) => {
        if (completed) return;
        completed = true;
        if (onError) return onError(error);
        throw error;
    };
    let processedData;
    try {
        processedData = isPreprocessor(processor) ?
            processor({...data, ready: complete}) : data.data;
        if (isPromise(processedData)) {
            return processedData.then(complete, fail);
        }
    } catch (error) {
        // A synchronous ready/next call may already have completed this stage.
        if (completed) throw error;
        return fail(error);
    }
    if (processedData !== undefined) {
        return complete(processedData);
    }
};

export const createRemoteProcessor = (preprocessor: ((input: any) => any) | ((input: any) => any)[], provider: TileProvider) => function(
    data: any[] | PostProcesserInput,
    ready,
    tile?: Tile,
    onError?: (error: any) => void
) {
    const processorInput: ProcessorInput = {
        data: data,
        provider,
        ready: ready
    };

    if (tile) {
        processorInput.tile = {
            x: tile.x,
            y: tile.y,
            z: tile.z,
            quadkey: tile.quadkey
        };
    }
    const stages = Array.isArray(preprocessor) ? preprocessor : preprocessor ? [preprocessor] : [];
    const next = (index: number, data) => {
        if (index === stages.length) {
            return ready(data);
        }
        return executeProcessor(stages[index], {
            ...processorInput, data, ready: (result) => next(index + 1, result)
        }, onError);
    };
    return next(0, data);
};
