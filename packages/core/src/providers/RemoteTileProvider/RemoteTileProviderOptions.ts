/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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

import {type TileProviderOptions} from '../TileProvider/TileProviderOptions';
import {GeoJSONFeature} from '../../features/GeoJSON';
import type {ModelTextureData} from '../../styles/ModelStyle';
import type {
    PreProcessor,
    WorkerPreProcessorFunction,
    WorkerPreProcessorInput,
    WorkerPreProcessorContext,
    WorkerPreProcessorUtils
} from './processors';

/**
 * Run a single worker processor. For worker followed by main-thread processing,
 * use {@link PreProcessorPipelineOptions}.
 *
 * @public
 */
export interface WorkerPreProcessorOptions extends WorkerPreProcessorStageOptions {
    /** @hidden */
    worker?: never;
    /** @hidden */
    main?: never;
    /**
     * Run this preprocessor in the provider's web worker. The `processor` function
     * must be self-contained; it cannot access closures or main-thread APIs.
     */
    execution: 'worker';
}

/** Configuration for one worker stage in {@link PreProcessorPipelineOptions}. */
export interface WorkerPreProcessorStageOptions {
    /**
     * A standalone function (serialized and reconstructed in the worker) or a URL
     * to a JavaScript module whose default export is the processor function.
     * Receives `(input, context)`, where {@link WorkerPreProcessorContext.options | context.options}
     * contains the configured options and {@link WorkerPreProcessorContext.utils | context.utils}
     * exposes worker-safe helpers such as {@link WorkerPreProcessorUtils.decodeTga}.
     * Serialized functions and module loading use dynamic code loading, which may
     * require `unsafe-eval` and module URLs to be permitted by the Content Security Policy.
     * Cross-origin module URLs must allow worker-origin CORS requests.
     * Receives {@link WorkerPreProcessorInput} (`data` and tile coordinates), not a
     * provider or `ready` callback; return the processed array or a Promise of it.
     * Utilities include base64 decoding, decompression, and
     * {@link WorkerPreProcessorUtils.decodeTga} for preparing {@link ModelTextureData}.
     */
    processor: WorkerPreProcessorFunction | URL | string;
    /**
     * Structured-cloneable values available as `context.options`; an empty
     * object is supplied when omitted.
     */
    options?: Record<string, unknown>;
}

/**
 * One worker processing stage in {@link PreProcessorPipelineOptions.worker}.
 *
 * Use a standalone {@link WorkerPreProcessorFunction}, a module URL (`string` or
 * `URL`) whose default export is the processor, or
 * {@link WorkerPreProcessorStageOptions} to provide a processor with options.
 * The worker phase determines the execution location; no `execution` field is needed.
 *
 * @example
 * ```ts
 * preProcessor: {
 *     worker: [
 *         ({data}) => data.filter((feature) => feature.properties.height > 0),
 *         {
 *             processor: ({data}, {options}) => {
 *                 return data.filter((feature) =>
 *                     feature.properties.height >= Number(options.minHeight)
 *                 );
 *             },
 *             options: {minHeight: 10}
 *         },
 *         './prepare-features.js'
 *     ]
 * }
 * ```
 *
 * @public
 */
export type WorkerPreProcessorStage = WorkerPreProcessorStageOptions | WorkerPreProcessorFunction | URL | string;

/**
 * Preprocess remote data in optional worker and main-thread phases before ingestion.
 *
 * Worker stages run sequentially after download/parse in the same provider worker.
 * Only their final result is transferred to the main thread, where main stages run
 * sequentially; there are no per-stage workers or transfers back to the worker.
 * Omitted phases, empty arrays, and `{}` are identity configurations.
 *
 * Worker phases require the automatically selected HTTP/GeoJSON worker loader;
 * they are not supported with a custom loader. Main-only pipelines support custom
 * loaders. Invalid stages or mixing pipeline fields with single-worker fields throw.
 * Processor exceptions and rejected Promises fail the tile request.
 *
 * @example
 * ```ts
 * preProcessor: {
 *     worker: {
 *         processor: ({data}, {options}) => data.filter(
 *             (feature) => feature.properties.population >= Number(options.minPopulation)
 *         ),
 *         options: {minPopulation: 1000}
 *     },
 *     // labelFor is an existing main-thread closure.
 *     main: ({data}) => data.map((feature) => ({
 *         ...feature,
 *         properties: {...feature.properties, label: labelFor(feature)}
 *     }))
 * }
 * ```
 *
 * @public
 */
export interface PreProcessorPipelineOptions {
    /**
     * One worker stage or a list, each receiving the previous stage's result.
     * Use a self-contained function, a module URL with a default-exported processor,
     * or {@link WorkerPreProcessorStageOptions} to supply structured-cloneable
     * `context.options`. `context.utils` provides worker-safe helpers.
     * Worker functions cannot access main-thread closures or APIs.
     * ArrayBuffers, typed-array buffers, and ImageBitmaps in the final result are
     * transferred (detaching worker-side resources); Blobs are structured-cloned.
     */
    worker?: WorkerPreProcessorStage | WorkerPreProcessorStage[];
    /**
     * One main-thread function or a list, each receiving the previous stage's result.
     * Functions may use existing closures and receive `data`, `tile`, `provider`,
     * and `ready`. Return the feature array or a Promise of it, or return undefined
     * and call `ready(features)` when callback-style asynchronous work completes.
     * The first stage receives the worker result, or loaded data when worker is omitted.
     */
    main?: PreProcessor | PreProcessor[];
    /** @hidden */
    execution?: never;
    /** @hidden */
    processor?: never;
    /** @hidden */
    options?: never;
}

/**
 * Configure remote data preprocessing using a main-thread function ({@link PreProcessor}),
 * sequential worker and main-thread phases
 * ({@link PreProcessorPipelineOptions}), or a single worker processor
 * ({@link WorkerPreProcessorOptions}).
 *
 * @example Main-thread preprocessing
 * ```ts
 * preProcessor: ({data}) => {
 *     for (const feature of data) {
 *         feature.properties.selected = selectedFeatureIds.has(feature.id);
 *     }
 *     return data;
 * }
 * ```
 * `selectedFeatureIds` is application state accessible on the main thread.
 *
 * @example Worker preprocessing
 * ```ts
 * preProcessor: {
 *     execution: 'worker',
 *     options: {minHeight: 10},
 *     processor: ({data}, {options}) => {
 *         return data.filter((feature) =>
 *             feature.properties.height >= Number(options.minHeight)
 *         );
 *     }
 * }
 * ```
 * The worker function is standalone and returns the processed features.
 *
 * @example Worker preprocessing followed by main-thread preprocessing
 * ```ts
 * preProcessor: {
 *     worker: {
 *         options: {minHeight: 10},
 *         processor: ({data}, {options}) => {
 *             return data.filter((feature) =>
 *                 feature.properties.height >= Number(options.minHeight)
 *             );
 *         }
 *     },
 *     main: ({data}) => {
 *         for (const feature of data) {
 *             feature.properties.selected = selectedFeatureIds.has(feature.id);
 *         }
 *         return data;
 *     }
 * }
 * ```
 * Worker filtering completes before main-thread access to application state.
 *
 * @public
 */
export type PreProcessorOptions = PreProcessor | WorkerPreProcessorOptions | PreProcessorPipelineOptions;

/**
 *  Configuration options of a RemoteTileProvider.
 */
export interface RemoteTileProviderOptions extends TileProviderOptions {
    /**
     * The zoomlevel at which tiles should be loaded from remote and a local index gets created.
     */
    level: number;

    /**
     * Preprocessor for remote data sources. A function runs on the main thread and
     * receives `data`, `ready`, and `tile`; it may return the processed features or a
     * Promise, or use `ready` for legacy callback-style async work. Use the worker
     * configuration on an HTTP/GeoJSON provider to automatically load and preprocess
     * GeoJSON in one worker per provider using an automatically selected worker loader.
     * Each LoaderManager limits concurrent tile tasks to 16, covering both download
     * and preprocessing. Started preprocessing is not cancelled; late results of
     * cancelled tile requests are ignored.
     * Worker processors receive only `data` and `tile`, plus the
     * context as a second argument, and must return the processed array or a Promise
     * of that array. The context exposes `options` and {@link WorkerPreProcessorUtils | utils}
     * for decoding base64, decompressing bytes, and preparing raw TGA model textures
     * without main-thread decoding.
     * They do not receive a provider reference or a `ready` callback. Worker mode is
     * not supported by `RemoteTileProvider` with a custom loader. ArrayBuffers,
     * typed-array buffers, and ImageBitmaps in the returned data are transferred to
     * the main thread; the corresponding worker-side resources are detached. Blob
     * assets are structured-cloned as Blobs, rather than returned as large text strings.
     * Configure both phases with {@link PreProcessorOptions}: `worker` and `main` each
     * accept one stage or an array. All worker stages execute sequentially after
     * download/parse in the same worker, with one final transfer; main stages then
     * execute sequentially before ingestion. No per-stage workers or transfers back
     * to the worker are used. Both phases are optional, and `{}` or empty arrays are
     * explicit identity. Main-only phases support custom loaders. Invalid or mixed
     * legacy/phased configurations throw rather than skipping stages.
     *
     * See {@link PreProcessorPipelineOptions} for a worker preparation and main mapping example.
     */
    preProcessor?: PreProcessorOptions;

    /**
     * PostProcessor for remote data sources.
     * The PostProcessor will be executed just before created/modified or removed Features will be sent to the remote backend.
     * If the processor function is returning the processed data then its treated as a synchronous processor.
     * If the processor function does not return any value (undefined) or a Promise then its treated as asynchronous processor.
     * An asynchronous processor that's not using a Promise MUST call the input.ready(..) callback when data processing is finished.
     *
     * Due to the execution of the processor in a separate worker thread the processor function must be scope independent.
     * The processor must be a "standalone function/class" that only depends on its own scope and only accesses its own local variables.
     * No references to the outer scope of the processor function are allowed.
     *
     *  @example
     * ```
     * // PostProcessorData:
     *  {put: GeoJsonFeature[],remove: GeoJsonFeature[]}
     * // PostProcessor:
     *  ({data: PostProcessorData, ready: (data) => void}) => PostProcessorData | Promise<GeoJsonFeature[]>
     * ```
     */
    postProcessor?(input: {
        data: { put: GeoJSONFeature[], remove: GeoJSONFeature[] },
        ready: (data) => void
    }): { put: GeoJSONFeature[], remove: GeoJSONFeature[] } | Promise<{ put: GeoJSONFeature[], remove: GeoJSONFeature[] }>;

    /**
     * To prevent an overwhelming volume of tile requests, any requests for zoom levels lower than the provider's setting are disregarded.
     * Enabling "ignoreTileQueryLimit" will bypass the tile query limit but may risk browser crashes.
     *
     * @defaultValue false
     */
    ignoreTileQueryLimit?: boolean;

    loader?: any;
}
