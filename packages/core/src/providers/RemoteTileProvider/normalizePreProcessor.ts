/*
 * Copyright (C) 2026 HERE Europe B.V.
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
import type {PreProcessorOptions, WorkerPreProcessorStageOptions} from './RemoteTileProviderOptions';
import type {PreProcessor} from './processors';

const invalid = (): never => {
    throw new Error('Invalid preProcessor configuration');
};

const list = (phase: unknown): unknown[] =>
    phase === undefined ? [] : Array.isArray(phase) ? Array.from(phase) : [phase];

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

const isProcessor = (value: unknown): value is WorkerPreProcessorStageOptions['processor'] =>
    typeof value === 'function' || value instanceof URL || typeof value === 'string' && !!value.trim();

const isWorkerStage = (value: unknown): value is WorkerPreProcessorStageOptions =>
    isRecord(value) &&
    !('execution' in value) &&
    isProcessor(value.processor) &&
    (value.options === undefined || isRecord(value.options));

/**
 * Normalize into worker/main arrays; throws for invalid configurations.
 * @internal
 */
export const normalizePreProcessor = (value: PreProcessorOptions | undefined): {
    worker: WorkerPreProcessorStageOptions[];
    main: PreProcessor[];
} => {
    if (value === undefined) {
        return {worker: [], main: []};
    }
    if (typeof value == 'function') {
        return {worker: [], main: [value]};
    }
    if (!isRecord(value)) {
        return invalid();
    }

    const config = value;
    let worker: unknown[];
    let main: unknown[];

    if ('execution' in config || 'processor' in config || 'options' in config) {
        if (config.execution !== 'worker' ||
            'worker' in config ||
            'main' in config
        ) {
            return invalid();
        }
        worker = [{processor: config.processor, options: config.options}];
        main = [];
    } else {
        worker = list(config.worker);
        main = list(config.main);
    }

    const workerStages = worker.map((stage): WorkerPreProcessorStageOptions => {
        if (isProcessor(stage)) {
            return {processor: stage};
        }
        if (!isWorkerStage(stage)) {
            return invalid();
        }
        return stage;
    });

    if (!main.every((stage): stage is PreProcessor => typeof stage === 'function')) {
        return invalid();
    }
    return {worker: workerStages, main};
};
