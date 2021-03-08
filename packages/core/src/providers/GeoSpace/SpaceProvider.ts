/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
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
import {GeoJSONFeature} from '@here/xyz-maps-core';


import {JSUtils, Queue} from '@here/xyz-maps-common';


import {SpaceProviderOptions, defaultOptions} from './SpaceOptions';
import {GeoJSONProvider} from '../GeoJSONProvider';
import {PostProcessor, PostProcesserInput, isPreprocessor} from '../RemoteTileProvider/processors';


type FeatureId = string | number;

const NS_XYZ = '@ns:com:here:xyz';

const HTTP = 'http://';

const XYZ_HUB_HERE_COM = '.here.com/hub/spaces';

const ENDPOINT = {
    'prd': HTTP + 'xyz.api' + XYZ_HUB_HERE_COM
};

const addUrlParams = (url: string, params: { [key: string]: string }, p: '?' | '&') => {
    for (const key in params) {
        url += p + key + '=' + params[key];
        p = '&';
    }
    return url;
};

const createOptions = (options, preProcessor?) => {
    options = JSUtils.extend(JSUtils.clone(defaultOptions), options);

    // credentials are send as url parameters...
    options.params = JSUtils.extend(options.params || {}, options.credentials);

    delete options.credentials;

    // support for deprecated "hidden preprocessors"
    if (isPreprocessor(preProcessor)) {
        options.preProcessor = preProcessor;
    }

    if (!options.url) {
        options.url = ENDPOINT[options['environment']];
    }
    if (options['https']) {
        options.url = options.url.replace(HTTP, 'https://');
    }
    return options;
};

type ErrorEventHandler = (error) => void;

/**
 * A SpaceProvider is a remote HTTPProvider designed to work with XYZ-Hub remote backend.
 * @see {@link https://xyz.api.here.com/hub/static/redoc/}
 */
export class SpaceProvider extends GeoJSONProvider {
    private tags: string[];
    private space: string;
    private clip: boolean;
    private psf: string; // property search filter

    /**
     * Base URL of the SpaceProvider.
     * It points to a XYZ-Hub space endpoint.
     *
     * @defaultValue "https://xyz.api.here.com/hub/spaces"
     */
    readonly url: string;

    /**
     * @param options - options to configure the provider
     */
    constructor(options: SpaceProviderOptions) {
        super(createOptions(options, arguments[1]));

        this.setUrl(this.getTileUrl(this.space));

        if (options.propertySearch) {
            this.setPropertySearch(options.propertySearch);
        }
    }

    /**
     * update config options of the provider.
     *
     * @param options - options to configure the provider
     */
    config(options: SpaceProviderOptions) {
        return super.config(options);
    };

    /**
     * Commit modified/removed features to the remote backend.
     *
     * @param data - the data that should be commit to the remote.
     * @param onSuccess - callback function that will be called when data has been commit successfully
     * @param onError - callback function that will be called when an error occurs
     */
    commit(data: {
        /**
         * features that should be created or updated
         */
        put?: GeoJSONFeature[],
        /**
         * features that should be removed
         */
        remove?: GeoJSONFeature[]
    }, onSuccess?, onError?) {
        const prov = this;
        const loaders = prov.loader.src;
        const loader = loaders[loaders.length - 1];
        let total = 0;
        let error = 0;

        const bundleSuccess = (data) => {
            if (!--total && onSuccess) {
                onSuccess(data);
            }
        };

        const bundleError = (err) => {
            error = error + 1;
            if (onError) {
                onError(err);
            }
        };

        if (typeof data == 'object') {
            const putFeatures = data.put || [];
            const removeFeatures = data.remove || [];

            if (putFeatures.length) {
                total++;
                loader.send(this.createUpdateFeatureRequest(putFeatures, {
                    success: bundleSuccess,
                    error: bundleError
                }));
            }

            if (removeFeatures.length) {
                total++;
                loader.send(this.createRemoveFeatureRequest(removeFeatures, {
                    success: bundleSuccess,
                    error: bundleError
                }));
            }
        }
    };

    /**
     * Get URL for layer specific requests.
     *
     * @param space - Name of the XYZ-Hub Space.
     * @returns url string to receive a layer resource of the remote http backend
     */
    getLayerUrl(space: string) {
        return this.url + '/' + space;
    };

    /**
     * Get URL for tile specific requests.
     *
     * @param space - Name of the XYZ-Hub Space.
     * @returns url string to receive a tile resource of the remote http backend
     */
    getTileUrl(space: string) {
        return this._addUrlFilters(
            this.getLayerUrl(space)
            + '/tile/quadkey/{QUADKEY}?margin=' + this.margin
            + '&clip=' + !!this.clip
        );
    };

    /**
     * Get the URL for feature specific requests.
     *
     * @param space - Name of the XYZ-Hub Space.
     * @param ids - id(s) of the feature(s) the provider want's to request
     *
     * @returns url string to receive the feature resource of the remote http backend
     */
    getFeatureUrl(space: string, ids: FeatureId | FeatureId[]) {
        if (!(ids instanceof Array)) {
            ids = [ids];
        }
        return this.getLayerUrl(space) + '/features?id=' + ids.join('&id=');
    };

    protected createUpdateFeatureRequest(features, callbacks: {
        success?: (resp: any) => void,
        error?: (error: any) => void
    } = {}) {
        const prov = this;
        const url = prov._addUrlCredentials(
            prov.getLayerUrl(prov.space) + '/features', '?'
        );
        return {
            type: 'POST',
            url: url,
            headers: {...prov.headers, 'Content-Type': 'application/geo+json'},
            data: JSON.stringify({
                type: 'FeatureCollection',
                features: features
            }),
            ...callbacks
        };
    }

    protected createRemoveFeatureRequest(features, callbacks: {
        success?: (resp: any) => void,
        error?: (error: any) => void
    } = {}) {
        const prov = this;
        const url = prov._addUrlCredentials(
            prov.getLayerUrl(prov.space) + '/features', '?'
        );
        return {
            type: 'DELETE',
            url: url + '&id=' + features.map((f) => f.id).join(','),
            headers: {
                ...prov.headers,
                'Accept': 'application/json'
            },
            ...callbacks
        };
    }


    prepareFeature(feature) {
        feature = super.prepareFeature(feature);

        let properties = feature.properties;

        if (!properties[NS_XYZ]) {
            properties[NS_XYZ] = {};
        }

        return feature;
    };

    setMargin(margin) {
        GeoJSONProvider.prototype.setMargin.call(this, margin);
        this.setUrl(this.getTileUrl(this.space));
    };

    setUrl(url: string) {
        this.loader.setUrl(
            this._addUrlCredentials(url)
        );
    };

    /**
     * Set tags to filtering results based on tags in Hub backend.
     * After setting tags, provider will clear all features and data will be
     * requested from hub including the new tag filter.
     *
     * @param tags - the tag(s) that will be send to xyz-hub endpoint
     */
    setTags(tags: string | string[]) {
        if (typeof tags == 'string') {
            tags = [tags];
        }

        this.tags = tags;

        this.setUrl(this.getTileUrl(this.space));

        this.clear();
    };

    /**
     * Sets result filtering based on properties search in Hub backend.
     * {@link https://www.here.xyz/api/devguide/propertiessearch/}
     *
     * After setting the property search, the provider will clear all features and data will be
     * requested from hub using the property search filter.
     * The response will contain only the features matching all conditions in the query.
     * If function is called without arguments all filters will be cleared.
     *
     *
     * @param key - the name of property
     * @param operator - the operator used
     * @param value - value the value to be matched
     *
     * @example
     * ``` javascript
     * // response will only contain features that have a property called 'name' with 'FirstName' as it's value
     * provider.setPropertySearch('name','=','FirstName')
     * ```
     *
     */
    setPropertySearch(
        key: string,
        operator: '=' | '!=' | '>' | '>=' | '<' | '<=',
        value: string | number | boolean | string[] | number[] | boolean[]
    ): void;
    /**
     *
     * Sets result filtering based on properties search in Hub backend.
     * {@link https://www.here.xyz/api/devguide/propertiessearch/}
     * After setting the property search, the provider will clear all features and data will be
     * requested from hub using the property search filter.
     * The response will contain only the features matching all conditions in the query.
     * If propertySearchMap is set to null or none is passed all previous set filters will be cleared.
     *
     * @param propertySearchMap - A Map of which the keys are the property names and its values are Objects
     * defining the operator ( '=', '!=', '\>', '\>=', '\<', '\<=' ) and the value to be matched.
     *
     * @example
     * ``` javascript
     * // set multiple conditions
     * // provider will only contain features that have a property called name with the value Max OR Peter
     * // AND a property called age with value less than 32
     * provider.setPropertySearch({
     *     'name': {
     *         operator: '=',
     *         value: ['Max','Petra']
     *     },
     *    'age': {
     *         operator: '<',
     *         value: 32
     *    }
     * })
     * ```
     *
     * @example
     * ``` javascript
     * // clear previous set filters
     * provider.setPropertySearch(null)
     * ```
     */
    setPropertySearch(propertySearchMap: {
        [name: string]: {
            operator: '=' | '!=' | '>' | '>=' | '<' | '<=',
            value: any | any[]
        }
    }): void;

    setPropertySearch(
        key?: string | {},
        operator?: string,
        value?: any | any[]
    ): void {
        let filterParamString = '';
        let filters;

        if (typeof key == 'string') {
            filters = {};
            filters[key] = {
                operator: operator,
                value: value
            };
        } else {
            filters = key;
        }

        for (let key in filters) {
            let filter = filters[key];
            operator = filter.operator
                .replace('>=', '=gte=')
                .replace('<=', '=lte=')
                .replace('>', '=gt=')
                .replace('<', '=lt=');

            value = filter.values == undefined ? filter.value : filter.values;

            if (!(value instanceof Array)) {
                value = [value];
            }

            value = value.map((v) => {
                if (typeof v == 'string') {
                    if (JSUtils.isNumeric(v) || v == 'true' || v == 'false' || v == 'null') {
                        v = '"' + v + '"';
                    }
                }
                return encodeURIComponent(v);
            });

            let prefix = key.slice(0, 2);
            // automatically attach property prefix if not defined already
            if (prefix != 'f.' && prefix != 'p.') {
                key = 'p.' + key;
            }

            filterParamString += key + operator + value + '&'; // .map((v) => +v == v ? v : +v);
        }

        this.psf = filterParamString.slice(0, -1); // slice last '&' character

        this.setUrl(this.getTileUrl(this.space));

        this.clear();
    };

    getCopyright(success?: (copyright: any) => void, error?: ErrorEventHandler) {
        this.getDefinition((def) => {
            success && success(def.copyright || []);
        }, error);
    };

    definition = null;

    getDefinition(onSuccess: (definition: any) => void, onError?: ErrorEventHandler) {
        const prov = this;
        const loaders = prov.getLoader().src;
        let definition = prov.definition;

        if (definition == null) {
            let queue = new Queue();
            definition = this.definition = queue;

            loaders[loaders.length - 1].send({
                url: prov._addUrlCredentials(prov.getLayerUrl(prov.space), '?'),
                key: 'def',
                success: (def) => {
                    prov.definition = def;
                    // success && success(def);
                    queue.done(def);
                },
                error: (err) => {
                    prov.definition = [];
                    if (onError) {
                        onError(err);
                    }
                },
                headers: {...this.headers, 'Accept': 'application/json'}
            });
        }

        if (onSuccess) {
            if (definition instanceof Queue) {
                definition.add(onSuccess);
            } else {
                onSuccess(definition);
            }
        }
    };


    _requestFeatures(ids: FeatureId[], onsuccess: (features: any[]) => void, onerror?: ErrorEventHandler, opt?) {
        const loaders = this.loader.src;


        loaders[loaders.length - 1].send({

            key: ids.join('&'),

            url: this._addUrlCredentials(
                this.getFeatureUrl(this.space, ids)
            ),

            success: (data) => {
                onsuccess(data.features);
            },

            headers: this.headers,

            error: onerror
        });
    };


    private _addUrlCredentials(url: string, p?: '?' | '&') {
        url = addUrlParams(url, this.params, p || '&');
        return url;
    };


    private _addUrlFilters(url: string) {
        // attach tags
        const {tags, psf} = this;

        if (tags && tags.length) {
            url += '&tags=' + tags.join(',');
        }

        if (psf) {
            url += '&' + psf;
        }

        return url;
    };
}
