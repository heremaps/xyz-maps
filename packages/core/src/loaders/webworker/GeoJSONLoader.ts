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

import WorkerHTTPLoader from './HTTPLoader';
import type {HTTPLoaderOptions} from '../HTTPLoader';
import type {PreProcessorOptions} from '../../providers/RemoteTileProvider/RemoteTileProviderOptions';

interface WorkerProcessorConfig {
    type: 'function' | 'module';
    source: string;
    options?: Record<string, unknown>;
}

const serializeProcessor = (config: PreProcessorOptions): WorkerProcessorConfig => {
    const {processor, options} = config;
    if (typeof processor == 'function') {
        return {
            type: 'function',
            source: processor.toString(),
            options
        };
    }
    return {
        type: 'module',
        source: processor instanceof URL ? processor.href : new URL(processor, document.baseURI).href,
        options
    };
};

export interface GeoJSONWorkerLoaderOptions extends HTTPLoaderOptions {
    preProcessor: PreProcessorOptions;
}

class GeoJSONWorkerLoader extends WorkerHTTPLoader {
    constructor(options: GeoJSONWorkerLoaderOptions) {
        const {preProcessor, url, headers, withCredentials} = options;
        super('GeoJSONWorker', {
            url,
            headers,
            withCredentials,
            responseType: 'arraybuffer'
        }, undefined, {
            responseType: 'arraybuffer',
            headers,
            withCredentials,
            processor: serializeProcessor(preProcessor)
        });
    }

    protected processData(data: any) {
        return data;
    }
}

export default GeoJSONWorkerLoader;
