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
import {SpaceProvider} from '../GeoSpace/SpaceProvider';
import {type IMLProviderOptions} from './IMLProviderOptions';
import {type SpaceProviderOptions} from '../GeoSpace/SpaceOptions';
import type {PreProcessorOptions} from '../RemoteTileProvider/RemoteTileProviderOptions';

const IML_ENDPOINT = 'http://interactive.data.api.platform.here.com/interactive/v1';

const createOptions = (options: IMLProviderOptions): SpaceProviderOptions => {
    const opt = {
        url: IML_ENDPOINT,
        https: true,
        space: options.layer,
        ...options,
        credentials: {...options.credentials}
    };
    // remove the token
    delete opt.credentials.token;

    return <SpaceProviderOptions><unknown>opt;
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
     *
     * To decode model assets off the main thread, use a standalone worker preprocessor.
     * The function must return the feature array; it cannot use closures or the DOM.
     * Worker mode automatically selects a worker loader with one worker per provider.
     * Each LoaderManager allows up to 16 concurrent tile tasks, including download
     * and preprocessing. Started preprocessing cannot be cancelled; late results
     * of cancelled requests are ignored. Main-thread preprocessors may use `ready`;
     * worker preprocessors must return the array or a Promise of it.
     * Use {@link PreProcessorOptions} with optional `worker` and `main` phases
     * (one stage or arrays): worker stages share the download worker and transfer
     * only their final result, then main stages run sequentially before ingestion.
     * Empty phases are identity; worker phases require automatic HTTP loading.
     * The example assumes features already contain an OBJ `modelSource` with OBJ/MTL
     * assets. `tgaGzipBase64` maps exact MTL `map_Kd` texture filenames (for example,
     * `"facade.tga"`) to base64-encoded gzip TGA assets. The utilities decode these
     * into {@link ModelTextureData}; existing model assets and textures are preserved.
     *
     * @example
     * ```ts
     * const provider = new IMLProvider({
     *     level: 10,
     *     layer: 'models',
     *     catalog: 'hrn:here:data::example:catalog',
     *     credentials: {apiKey: 'YOUR_API_KEY'},
     *     preProcessor: {
     *         worker: {processor: async ({data}, {utils}) => {
     *             for (const feature of data) {
     *                 const {modelSource, tgaGzipBase64} = feature.properties;
     *                 modelSource.textures ||= {};
     *                 for (const filename of Object.keys(tgaGzipBase64)) {
     *                     const bytes = await utils.decompress(utils.decodeBase64(tgaGzipBase64[filename]), 'gzip');
     *                     modelSource.textures[filename] = utils.decodeTga(bytes);
     *                 }
     *                 delete feature.properties.tgaGzipBase64;
     *             }
     *             return data;
     *         }},
     *         main: ({data}) => data
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

    getLayerUrl(layer: string) {
        return this.url + '/catalogs/' + this.catalog + '/layers/' + layer;
    }


    /**
     * Get or set configuration options for the provider.
     *
     * If a string is provided as the first argument, returns the value of the corresponding property.
     * If an object is provided, sets the provider's properties according to the object.
     *
     * @param options - The configuration key as a string to get a value, or an object to set multiple options.
     * @param value - Optional value to set if a string key is provided.
     */
    config(options: IMLProviderOptions|string, value?: any) {
        if (options === 'credentials') {
            options = {credentials: value} as IMLProviderOptions;
            value = undefined;
        }
        const token = (options as IMLProviderOptions)?.credentials?.token;
        if (token) {
            this.token = token;
            delete (options as IMLProviderOptions).credentials.token;
        }
        return super.config(options, value);
    };
}
