/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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

import {RemoteTileProvider} from '../RemoteTileProvider/RemoteTileProvider';
import LoaderManager from '../../loaders/Manager';
import {HTTPLoader} from '../../loaders/HTTPLoader';

import {JSUtils} from '@here/xyz-maps-common';

/* exported Options */

import Options from './HTTPProviderOptions';

const doc = Options; // doc only!


const parseParams = (url: string, params?: { [key: string]: string }) => {
    params = params || {};
    url.split(/\?|\&/).slice(1).map((p) => {
        p = <any>p.split(/\=/);
        params[p[0]] = p[1];
    });
    return params;
};

/**
 *  Remote HTTP tile provider.
 *
 *  @public
 *  @class
 *  @expose
 *  @constructor
 *  @extends here.xyz.maps.providers.RemoteTileProvider
 *  @param {here.xyz.maps.providers.HTTPProvider.Options} config configuration of the provider
 *  @param {Object} defaultConfig
 *  @name here.xyz.maps.providers.HTTPProvider
 */
class HTTPProvider extends RemoteTileProvider {
    protected url: string;
    protected params;
    protected headers: { [name: string]: string };

    constructor(options, preprocessor?) {
        options = options || {};

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

        super(options, preprocessor);

        this.setParams(options.params || {});
        this.setHeaders(options.headers || {});
    }


    /**
     *  Get a specific request-header being added to all requests handled by provider.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.HTTPProvider#getHeader
     *  @param {string} name
     *      The name of header to retrieve
     *  @return value of the request header or null if the header does not exist
     */
    getHeader(name: string): string | null {
        const loaders = this.loader.src;
        return loaders[loaders.length - 1].headers[name] || null;
    }

    /**
     *  Get the request-headers being added to all requests handled by provider.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.HTTPProvider#getHeaders
     *  @return map of key value pairs. the key represents the header name
     */
    getHeaders(): { [name: string]: string } {
        const loaders = this.loader.src;
        return JSUtils.clone(loaders[loaders.length - 1].headers);
    }

    /**
     *  Set request-header that should be added to all request handled by provider.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.HTTPProvider#setHeader
     *  @param {string} name
     *      The name of the header whose value is to be set.
     *  @param {string} value
     *      The value to set as the body of the header.
     */
    setHeader(name: string, value: string) {
        const loaders = this.loader.src;
        let headers = this.getHeaders();

        headers[name] = value;

        loaders[loaders.length - 1].headers = headers;
        this.headers = headers;
    }

    /**
     *  Set request-headers that should be added to all request handled by provider.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.HTTPProvider#setHeaders
     *  @param {string} map
     *      Map of key value pairs. the key represents the header name
     */
    setHeaders(headers: { [name: string]: string }) {
        const loaders = this.loader.src;
        let _headers = this.getHeaders();

        JSUtils.extend(_headers, headers);

        loaders[loaders.length - 1].headers = _headers;
        this.headers = _headers;
    }

    /**
     *  Get the request-parameter being added by provider to all requests.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.HTTPProvider#getParams
     *  @return map of key value pairs. the key represents the parameter name
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
     *  Get a specific request-parameter that's being added by provider to all requests.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.HTTPProvider#getParam
     *  @param {string} name
     *      The name of parameter to retrieve
     *  @return value of the request parameter or null if the parameter does not exist
     */
    getParam(name: string): string | null {
        return this.params[name] || null;
    }

    /**
     *  Set request-parameters that should be added to all request handled by provider.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.HTTPProvider#setParams
     *  @param {string} map
     *      A map of key value pairs. the key represents the parameter name.
     *      Possible value types are string, string[] or undefined.
     *      If undefined is used parameter get's cleared/removed.
     */
    setParams(parameters: { [name: string]: string }) {
        const loaders = this.loader.src;
        const loader = loaders[loaders.length - 1];
        const url = loader.baseUrl;
        let params = this.params || {};

        JSUtils.extend(params, parameters);
        this.params = params;

        // in case of url is defined as a function user needs to deal with params by himself.
        if ( typeof url == 'string' ) {
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
     *  Set a specific request-parameter that should be added to all request handled by provider.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.HTTPProvider#setParam
     *  @param {string} name
     *      The name of the parameter whose value is to be set.
     *  @param {string|string[]|undefined} value
     *      The value(s) of the parameter.
     *      If undefined is set parameter get's cleared/removed.
     */
    setParam(name: string, value: string|string[]) {
        let params = {};
        params[name] = value;
        this.setParams(params);
    }

    config(cfg) {
        super.config(cfg);

        if (cfg && cfg.url) {
            // also updated tile loader url
            this.setParams({});
        }
        return this;
    }
}

export default HTTPProvider;
