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

import {EditableRemoteTileProvider} from '../RemoteTileProvider/EditableRemoteTileProvider';
import LoaderManager from '../../loaders/Manager';
import {HTTPLoader} from '../../loaders/HTTPLoader';
import {JSUtils} from '@here/xyz-maps-common';
import {HTTPProviderOptions} from './HTTPProviderOptions';
import {Feature} from '../../features/Feature';


const METHOD_NOT_IMPLEMENTED = 'Method not implemented.';

const parseParams = (url: string, params?: { [key: string]: string }) => {
    params = params || {};
    url.split(/\?|\&/).slice(1).map((p) => {
        p = <any>p.split(/\=/);
        params[p[0]] = p[1];
    });
    return params;
};

/**
 *  The HTTPProvider fetches data from remote HTTP data-sources.
 */
abstract class HTTPProvider extends EditableRemoteTileProvider {
    protected url: string;
    protected params;
    protected headers: { [name: string]: string };

    /**
     * @param options - options to configure the provider
     */
    constructor(options: HTTPProviderOptions) {
        let loader = options.loader;

        if (loader) {
            if (!(loader instanceof LoaderManager)) {
                loader = new LoaderManager(loader);
            }
        } else {
            loader = new LoaderManager(
                // new IndexDBLoader( config['url'] ),
                new HTTPLoader({
                    url: options['url'],
                    withCredentials: options['withCredentials'],
                    headers: options['headers']
                    // parser: config['parser'] || DEFAULT_JSON_PARSER,
                })
            );
        }
        options.loader = loader;

        super(options);

        this.setParams(options.params || {});
        this.setHeaders(options.headers || {});
    }

    protected _httpLoader(): HTTPLoader {
        const loaders = this.remoteTileLoader.loader.src;
        return loaders[loaders.length - 1];
    }

    /**
     *  Get a specific request-header being added to all requests handled by the provider.
     *
     *  @param name - The name of header to retrieve
     *
     *  @returns value of the request header or null if the header does not exist
     */
    getHeader(name: string): string | null {
        return this._httpLoader().headers[name] || null;
    }

    /**
     *  Get the request-headers being added to all requests handled by the provider.
     *
     *  @returns Map of key value pairs. the key represents the header name
     */
    getHeaders(): { [name: string]: string } {
        return JSUtils.clone(this._httpLoader().headers);
    }

    /**
     *  Set request-header that should be added to all request handled by the provider.
     *
     *  @param name - The name of the header whose value is to be set.
     *  @param value - The value to set as the body of the header.
     */
    setHeader(name: string, value: string) {
        let headers = this.getHeaders();

        headers[name] = value;

        this._httpLoader().headers = headers;
        this.headers = headers;
    }

    /**
     *  Set request-headers that should be added to all request handled by the provider.
     *
     *  @param map - Map of key value pairs. the key represents the header name.
     */
    setHeaders(headers: { [name: string]: string }) {
        let _headers = this.getHeaders();

        JSUtils.extend(_headers, headers);

        this._httpLoader().headers = _headers;
        this.headers = _headers;
    }

    /**
     *  Get the request-parameters that are being added by the provider to all requests.
     *
     *  @returns Map of key value pairs. the key represents the parameter name.
     */
    getParams(): { [name: string]: string } {
        // const params = {};
        // let url = this.loader.src[0].baseUrl;
        // url.split(/\?|\&/).slice(1).map((p)=>{
        //     p = p.split(/\=/);
        //     params[p[0]] = p[1];
        // });
        return this.params;
    }

    /**
     *  Get a specific request-parameter that's being added by the provider to all requests.
     *
     *  @param name - The name of parameter to retrieve
     *
     *  @returns value of the request parameter or null if the parameter does not exist
     */
    getParam(name: string): string | null {
        return this.params[name] || null;
    }

    /**
     *  Set request-parameters that should be added to all request handled by provider.
     *
     *  @param map - A map of key value pairs. the key represents the parameter name. Possible value types are string, string[] or undefined. If undefined is used parameter get's cleared/removed.
     */
    setParams(parameters: { [name: string]: string | string[] | undefined }) {
        const loader = this._httpLoader();
        const url = loader.baseUrl;
        let params = this.params || {};

        JSUtils.extend(params, parameters);
        this.params = params;

        // in case of url is defined as a function user needs to deal with params by himself.
        if (typeof url == 'string') {
            params = JSUtils.extend(parseParams(url), params);

            let newUrl = url.split(/\?/)[0];
            let p = '?';
            for (let key in params) {
                let val = params[key];
                if (val === undefined) {
                    delete params[key];
                } else {
                    newUrl += p + key + '=' + val;
                    p = '&';
                }
            }
            loader.setUrl(newUrl);
        }
    }

    /**
     * Set a specific request-parameter that should be added to all request handled by provider.
     * If undefined is set the parameter get's cleared/removed.
     *
     * @param name - The name of the parameter whose value is to be set.
     * @param value - The value(s) of the parameter.
     */
    setParam(name: string, value: string | string[] | undefined) {
        let params = {};
        params[name] = value;
        this.setParams(params);
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
    config(options: HTTPProviderOptions| string, value?: any) {
        if ( options === 'url' && typeof value === 'string') {
            options = {url: value} as HTTPProviderOptions;
            value = undefined;
        }
        const retVal = super.config(options, value);
        if ((options as HTTPProviderOptions)?.url) {
            // also updated tile loader url
            this.setParams({});
        }
        return retVal;
    }

    commit(features, onSuccess, onError, transactionId?: string) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    /**
     *  Get URL feature specific requests.
     *
     *  @param layer - the id of the layer
     *  @param featureId - id of the feature the provider want's to request
     *
     *  @returns url string to receive the feature resource of the remote http backend
     */
    abstract getFeatureUrl(layer: string, featureId: string | number): string;


    /**
     *  Get URL for layer specific requests.
     *
     *  @param layer - the id of the layer
     *  @returns url string to receive a layer resource of the remote http backend
     */
    abstract getLayerUrl(layer: string): string;


    /**
     *  Get URL for tile specific requests.
     *
     *  @param layer - the id of the layer
     *  @returns url string to receive a tile resource of the remote http backend
     */
    abstract getTileUrl(layer: string): string;

    // request individual features from backend
    _requestFeatures(ids, onSuccess, onError, opt?) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    readZLevels(link: Feature): number[] {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeZLevels(link: Feature, zLevels: number[]) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }
}

HTTPProvider.prototype.getFeatureUrl =
    HTTPProvider.prototype.getLayerUrl =
        HTTPProvider.prototype.getTileUrl = function() {
            throw new Error(METHOD_NOT_IMPLEMENTED);
        };

export {HTTPProvider};
