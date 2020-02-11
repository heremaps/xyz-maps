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

import {EditableProvider} from '../EditableProvider';

import {Feature} from '../../features/Feature';
import {JSUtils, Queue} from '@here/xyz-maps-common';

/* exported SpaceProviderOptions */

import SpaceProviderOptions from './SpaceOptions';

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

const METHOD_NOT_IMPLEMENTED = 'Method not implemented.';

const createOptions = (options) => {
    options = JSUtils.extend(JSUtils.clone(SpaceProviderOptions), options);

    // credentials are send as url parameters...
    options.params = JSUtils.extend(options.params || {}, options.credentials);

    delete options.credentials;

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
 *  GeoSpace provider
 *
 *  @public
 *  @expose
 *  @constructor
 *  @extends here.xyz.maps.providers.EditableProvider
 *  @param {here.xyz.maps.providers.SpaceProvider.Options} config configuration of the provider
 *  @param {Function} preprocessor function to be called after this provider is ready.
 *  @name here.xyz.maps.providers.SpaceProvider
 */
export class SpaceProvider extends EditableProvider {
    private tags: string[];
    private space: string;
    private clip: boolean;
    private psf: string; // property search filter

    constructor(options, preprocessor) {
        super(createOptions(options), preprocessor);

        /**
         *  url of the provider, it points to end point of geospace service.
         *
         *  @public
         *  @expose
         *  @type {String}
         *  @name here.xyz.maps.providers.SpaceProvider#url
         */
        this.setUrl(this.getTileUrl(this.space));
        if (options.propertySearch) {
            this.setPropertySearch(options.propertySearch);
        }
    }

    /**
     *  set config for provider.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.SpaceProvider#config
     *  @param {here.xyz.maps.providers.SpaceProvider.Options} cfg
     *  @return {here.xyz.maps.providers.SpaceProvider}
     */
    // config


    commit(features, onSuccess?, onError?) {
        const prov = this;
        const loaders = prov.loader.src;
        const loader = loaders[loaders.length - 1];

        const url = prov._addUrlCredentials(
            prov.getLayerUrl(prov.space) + '/features', '?'
        );

        const bundleSuccess = (data) => {
            if (!--total) {
                onSuccess && onSuccess(data);
            }
        };

        const bundleError = (err) => {
            error = error + 1;
            onError && onError(err);
        };

        let total = 0;
        let error = 0;

        function prepareFeatures(features) {
            if (!(features instanceof Array)) {
                features = [features];
            }

            let len = features.length;
            let feature;
            let props;

            while (len--) {
                feature = features[len] = Feature.prototype.toJSON.call(features[len]);

                if (props = feature.properties) {
                    delete props['@ns:com:here:editor'];
                }
            }

            return features;
        }


        if (features) {
            const putFeatures = prepareFeatures(features.put || []);

            if (putFeatures.length) {
                total++;
                loader.send({

                    url: url,

                    success: bundleSuccess,

                    error: bundleError,

                    type: 'POST',

                    headers: {...prov.headers, 'Content-Type': 'application/geo+json'},

                    data: JSON.stringify({
                        type: 'FeatureCollection',
                        features: putFeatures
                    })
                });
            }

            const removeFeatures = prepareFeatures(features.remove || []);

            if (removeFeatures.length) {
                total++;
                loader.send({

                    url: url + '&id=' + removeFeatures.map((f) => f.id).join(','),

                    success: bundleSuccess,

                    error: bundleError,

                    headers: {...prov.headers, 'Accept': 'application/json'},

                    type: 'DELETE'
                });
            }
        }
    };


    prepareFeature(feature) {
        feature = super.prepareFeature(feature);

        let properties = feature.properties;

        if (!properties[NS_XYZ]) {
            properties[NS_XYZ] = {};
        }

        return feature;
    };

    setMargin(margin) {
        EditableProvider.prototype.setMargin.call(this, margin);
        this.setUrl(this.getTileUrl(this.space));
    };


    getLayerUrl(layer: string) {
        return this.url + '/' + layer;
    };


    setUrl(url: string) {
        this.loader.setUrl(
            this._addUrlCredentials(url)
        );
    };


    getTileUrl(layer: string) {
        return this._addUrlFilters(
            this.getLayerUrl(layer)
            + '/tile/quadkey/{QUADKEY}?margin=' + this.margin
            + '&clip=' + !!this.clip
        );
    };


    /**
     *  Set tags to filtering results based on tags in Hub backend.
     *  After setting tags, provider will clear all features and data will be
     *  requested from hub including the new tag filter.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.SpaceProvider#setTags
     *  @param {string|Array.<string>} tags
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
     *  Sets result filtering based on properties search in Hub backend.
     *  {@link https://www.here.xyz/api/devguide/propertiessearch/}
     *  After setting the property search, the provider will clear all features and data will be
     *  requested from hub using the property search filter.
     *  The response will contain only the features matching all conditions in the query.
     *  If function is called without arguments all filters will be cleared.
     *
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.SpaceProvider#setPropertySearch
     *  @param {string} property the name of property
     *  @param {string} operator the operator used
     *  @param {string|number|boolean} value the value to be matched
     *
     *  @example
     *  // response will only contain features that have a property called 'name' with 'FirstName' as it's value
     *  provider.setPropertySearch('name','=','FirstName')
     *  @also
     *
     *  Sets result filtering based on properties search in Hub backend.
     *  {@link https://www.here.xyz/api/devguide/propertiessearch/}
     *  After setting the property search, the provider will clear all features and data will be
     *  requested from hub using the property search filter.
     *  The response will contain only the features matching all conditions in the query.
     *  If propertySearchMap is set to null or none is passed all previous set filters will be cleared.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.SpaceProvider#setPropertySearch
     *  @param {string=} propertySearchMap A Map of which the keys are the property names and its values are Objects
     *  defining the operator ( '=', '!=', '>', '>=', '<', '<=' ) and the value to be matched.
     *
     *  @example
     *  // set multiple conditions
     *  // provider will only contain features that have a property called name with the value Max OR Peter
     *  // AND a property called age with value less than 32
     *  provider.setPropertySearch({
     *      'name': {
     *          operator: '=',
     *          value: ['Max','Petra']
     *      },
     *      'age': {
     *          operator: '<',
     *          value: 32
     *      }
     *  })
     *
     *  @example
     *  // clear previous set filters
     *  provider.setPropertySearch(null)
     */
    setPropertySearch(key?: string | {}, operator?: string, value?: any | any[]) {
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

        console.log(this.psf);

        this.setUrl(this.getTileUrl(this.space));

        this.clear();
    };


    getFeatureUrl(layer: string, ids: FeatureId | FeatureId[], opt?) {
        if (!(ids instanceof Array)) {
            ids = [ids];
        }
        return this.getLayerUrl(layer) + '/features?id=' + ids.join('&id=');
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
                this.getFeatureUrl(this.space, ids, opt)
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

    readDirection(link: Feature): 'BOTH' | 'START_TO_END' | 'END_TO_START' {
        throw new Error(METHOD_NOT_IMPLEMENTED);
        // return 'BOTH';
    }

    readPedestrianOnly(link: Feature): boolean {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeTurnRestriction(restricted: boolean, turnFrom: { link: Feature; index: number; }, turnTo: { link: Feature; index: number; }) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    readRoutingProvider(location: Feature, providers?: EditableProvider[]): string {
        return this.id;
    }

    readRoutingPosition(feature: any): [number, number, number?] {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    readRoutingLink(feature: any): string | number {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeRoutingPosition(feature: any, position: [number, number, number?]) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeRoutingLink(location: any, link: Feature) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    readTurnRestriction(turnFrom: { link: Feature; index: number; }, turnTo: { link: Feature; index: number; }): boolean {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeEditState(feature, editState: 'created' | 'modified' | 'removed' | 'split') {
    }
}
