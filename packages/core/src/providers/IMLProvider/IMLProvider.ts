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
     * Returning Blobs for inline OBJ/MTL/textures avoids sending large decoded strings
     * back to the main thread. Browser-decodable image Blobs can be returned as texture
     * entries; convert formats such as TGA in the worker before returning them. Remove
     * large encoded source properties before returning the features if they are no
     * longer needed.
     *
     * @example
     * ```ts
     * const provider = new IMLProvider({
     *     level: 10,
     *     layer: 'models',
     *     catalog: 'hrn:here:data::example:catalog',
     *     credentials: {apiKey: 'YOUR_API_KEY'},
     *     preProcessor: {
     *         execution: 'worker',
     *         options: {
     *             objProperty: 'objGzipBase64',
     *             mtlProperty: 'mtlGzipBase64'
     *         },
     *         processor: async ({data}, options) => {
     *             const decodeGzipBase64 = async (encoded) => {
     *                 const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
     *                 const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
     *                 return new Response(stream).text();
     *             };
     *             const objProperty = String(options.objProperty);
     *             const mtlProperty = String(options.mtlProperty);
     *             for (const feature of data) {
     *                 const obj = await decodeGzipBase64(feature.properties[objProperty]);
     *                 const encodedMTL = feature.properties[mtlProperty];
     *                 const mtl: Record<string, Blob> = {};
     *                 for (const filename of Object.keys(encodedMTL || {})) {
     *                     mtl[filename] = new Blob([
     *                         await decodeGzipBase64(encodedMTL[filename])
     *                     ], {type: 'text/plain'});
     *                 }
     *                 feature.properties.modelSource = {
     *                     format: 'obj',
     *                     obj: new Blob([obj], {type: 'text/plain'}),
     *                     mtl
     *                 };
     *                 delete feature.properties[objProperty];
     *                 delete feature.properties[mtlProperty];
     *             }
     *             return data;
     *         }
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
