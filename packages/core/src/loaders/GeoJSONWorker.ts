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

import {HTTPWorker} from './webworker/HTTPWorker';
import {TransferableCollector} from './webworker/TransferableCollector';
import {decodeTga} from './webworker/decodeTga';
import {decodeBase64} from './webworker/decodeBase64';
import {decompress} from './webworker/decompress';
import type {GeoJSONFeature} from '../features/GeoJSON';
import type {WorkerPreProcessorFunction, WorkerPreProcessorInput} from '../providers/RemoteTileProvider/processors';

interface WorkerProcessorConfig {
    type: 'function' | 'module';
    source: string;
    options?: Record<string, unknown>;
}

interface WorkerProcessorResult {
    data: GeoJSONFeature[];
    transfer: Transferable[];
}

const isWorkerProcessor = (processor: unknown): processor is WorkerPreProcessorFunction => typeof processor == 'function';

const loadProcessor = async (config: WorkerProcessorConfig): Promise<WorkerPreProcessorFunction> => {
    if (config.type == 'module') {
        const loadModule = new Function('url', 'return import(url)') as (url: string) => Promise<{ default?: unknown }>;
        const module = await loadModule(config.source);
        const processor = module.default;
        if (!isWorkerProcessor(processor)) {
            throw new Error('Worker processor module must have a default function export');
        }
        return processor;
    }

    const source = config.source;
    const methodMatch = /^\s*(?:async\s+)?(?!async\b)([A-Za-z_$][\w$]*)\s*\(/.exec(source);
    const factorySource = methodMatch
        ? `return ({${source}}).${methodMatch[1]}`
        : `return (${source})`;
    const processor: unknown = new Function(factorySource)();
    if (!isWorkerProcessor(processor)) {
        throw new Error('Worker preProcessor must be a function');
    }
    return processor;
};

export default {
    id: 'GeoJSONWorker',
    Worker: class GeoJSONWorker extends HTTPWorker {
        private processor?: Promise<WorkerPreProcessorFunction>;
        private processorConfig: WorkerProcessorConfig;
        private processorOptions: Record<string, unknown>;

        constructor(options: { responseType?: string, processor: WorkerProcessorConfig }) {
            super({responseType: 'arraybuffer'});
            this.processorConfig = options.processor;
            this.processorOptions = options.processor.options || {};
        }

        async process(arrayBuffer: ArrayBuffer, x: number, y: number, z: number, quadkey: string): Promise<WorkerProcessorResult> {
            const response = arrayBuffer?.byteLength
                ? JSON.parse(new TextDecoder().decode(arrayBuffer))
                : [];
            const features = response?.type == 'FeatureCollection' ? response.features : response;
            if (!Array.isArray(features)) {
                throw new Error('Worker preProcessor expected a GeoJSON feature array or FeatureCollection');
            }

            const processor = await (this.processor ||= loadProcessor(this.processorConfig));
            const input: WorkerPreProcessorInput = {
                data: features,
                tile: {x, y, z, quadkey}
            };
            const result = await processor(input, {
                options: this.processorOptions,
                utils: {decodeTga, decodeBase64, decompress}
            });
            if (!Array.isArray(result)) {
                throw new Error('Worker preProcessor must return a GeoJSON feature array');
            }

            const transfer = new TransferableCollector();
            transfer.add(result);

            return {
                data: result,
                transfer: transfer.getTransferables()
            };
        }
    }
};
