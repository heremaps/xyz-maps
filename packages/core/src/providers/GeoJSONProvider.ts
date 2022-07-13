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

import {JSUtils} from '@here/xyz-maps-common';
import {HTTPProvider} from './HTTPProvider/HTTPProvider';
import {HTTPProviderOptions} from './HTTPProvider/HTTPProviderOptions';

const METHOD_NOT_IMPLEMENTED = 'Method not implemented.';

/**
 *  GeoJSONProvider is a remote HTTPProvider designed to work with GeoJSON data.
 */
export class GeoJSONProvider extends HTTPProvider {
    /**
     * @param options - options to configure the provider
     */
    constructor(options: HTTPProviderOptions) {
        options.level = options.level || 13;

        options.headers = JSUtils.extend({
            'Accept': 'application/geo+json'
        }, options.headers || {});

        super(options);
    }

    getFeatureUrl(layer: string, featureId: string | number): string {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    getLayerUrl(layer: string): string {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    getTileUrl(layer: string): string {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }
};
