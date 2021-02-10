/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
import {SpaceProvider} from '../GeoSpace/SpaceProvider';
import {IMLProviderOptions} from './IMLProviderOptions';
import {SpaceProviderOptions} from '../GeoSpace/SpaceOptions';

const IML_ENDPOINT = 'http://interactive.data.api.platform.here.com/interactive/v1';

const createOptions = (options: IMLProviderOptions): SpaceProviderOptions => {
    let o = {
        url: IML_ENDPOINT,
        https: true,
        space: options.layer,
        ...options,
        credentials: {...options.credentials}
    };
    // remove the token
    delete o.credentials.token;

    return <SpaceProviderOptions><unknown>o;
};

/**
 *  An IMLProvider is a remote HTTPProvider designed to work with HERE Interactive Map layer.
 *  @see https://developer.here.com/documentation/data-api/data_dev_guide/rest/getting-data-interactive.html
 *  @see https://interactive.data.api.platform.here.com/openapi/
 */
export class IMLProvider extends SpaceProvider {
    catalog: string;
    layer: string;

    private token?: string;

    // empty definition to prevent loading of "space definition"
    definition = [];

    /**
     * @param options - options to configure the provider
     * @example
     * ```ts
     * const provider = new IMLProvider({
     *     level: 10,
     *     layer: 'boston-liquor',
     *     catalog: 'hrn:here:data::olp-here:dh-showcase',
     *     credentials: {
     *         apiKey: "YOUR_API_KEY",
     *     }
     * });
     * ```
     */
    constructor(options: IMLProviderOptions) {
        super(createOptions(options));

        this.token = options.credentials?.token;
    }

    private addRequestToken(request) {
        (request.headers = request.headers || {}).Authorization = 'Bearer ' + this.token;
        return request;
    }

    protected createUpdateFeatureRequest(features, callbacks: {
        success?: (resp: any) => void,
        error?: (error: any) => void
    } = {}) {
        return this.addRequestToken(super.createUpdateFeatureRequest(features, callbacks));
    }

    protected createRemoveFeatureRequest(features, callbacks: {
        success?: (resp: any) => void,
        error?: (error: any) => void
    } = {}) {
        return this.addRequestToken(super.createRemoveFeatureRequest(features, callbacks));
    }

    getLayerUrl(layer) {
        return this.url + '/catalogs/' + this.catalog + '/layers/' + layer;
    }
}
