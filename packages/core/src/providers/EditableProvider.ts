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

import {prepareFeature, updateBBox} from '../data/prepare/EditableGeoJSON';
import {Feature} from '../features/Feature';
import {GeoJSONProvider} from './GeoJSONProvider';
import {JSUtils} from '@here/xyz-maps-common';

const geoToEdit = {
    'Point': 'MARKER',
    'LineString': 'LINE',
    'Polygon': 'AREA',
    'MultiPolygon': 'AREA'
};

let UNDEF;

type EditorFeature = { editState: (state?: string, value?) => any };

type Navlink = Feature;
type NavlinkId = string | number;

type FeatureClass = 'LINE' | 'NAVLINK' | 'MARKER' | 'PLACE' | 'ADDRESS' | 'AREA';

type TurnNode = {
    link: Navlink,
    index: number
};

type Coordinate = [number, number, number?];

type SplitHookData = {
    link: Navlink,
    index: number,
    children: [Navlink, Navlink],
    relativePosition: number // 0.0 -> 1.0
};
type DisconnectHookData = {
    link: Navlink,
    index: number
};
type RemoveHookData = {
    feature: Feature
};

type SplitHook = (data: SplitHookData) => void;
type DisconnectHook = (data: DisconnectHookData) => void;
type RemoveHook = (data: RemoveHookData) => void;

type Hooks = {
    'Navlink.split'?: SplitHook | SplitHook[],
    'Navlink.disconnect'?: DisconnectHook | DisconnectHook[],
    'Feature.remove'?: RemoveHook | RemoveHook[]
};


abstract class EditableProvider extends GeoJSONProvider {
    /**
     *  Editable provider.
     *
     *  @public
     *  @class
     *  @expose
     *  @constructor
     *  @extends here.xyz.maps.providers.GeoJSONProvider
     *  @param {here.xyz.maps.providers.TileProvider.Options} config configuration of the provider
     *  @name here.xyz.maps.providers.EditableProvider
     */

    /**
     *  Commit modified features to the backend
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.EditableProvider#commit
     *  @param {Object} data the data to commit to the backend
     *  @param {here.xyz.maps.providers.FeatureProvider.Feature|Array.<here.xyz.maps.providers.FeatureProvider.Feature>} data.put features that should be created or updated
     *  @param {here.xyz.maps.providers.FeatureProvider.Feature|Array.<here.xyz.maps.providers.FeatureProvider.Feature>} data.remove features that should be removed
     *  @param {Function=} onSuccess callback function on success
     *  @param {Function=} onError callback function on error
     */

    /**
     *  Get url feature requests.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.EditableProvider#getFeatureUrl
     *  @param {Array.<String>} layer layer id
     *  @param {Object=} feature feature id
     *  @return {String} feature url
     */

    /**
     *  Get url for layer requests.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.EditableProvider#getLayerUrl
     *  @param {String} layer layer id
     *  @return {String} url to layer
     */

    /**
     *  Get url for tile requests.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.here.xyz.maps.providers.EditableProvider#getTileUrl
     *  @param {String} layer layer id
     *  @return {String} url to a tile in a layer
     */
    constructor(options, _preprocessor) {
        super(options, _preprocessor);
    }


    abstract commit(features, onSuccess, onError, transactionId?: string);

    abstract getFeatureUrl(layer, id);

    abstract getLayerUrl(layer);

    abstract getTileUrl(layer);

    // request individual features from backend
    protected abstract _requestFeatures(ids, onSuccess, onError, opt?);

    abstract readDirection(link: Navlink): 'BOTH' | 'START_TO_END' | 'END_TO_START';

    abstract readPedestrianOnly(link: Navlink): boolean;

    abstract readTurnRestriction(turnFrom: TurnNode, turnTo: TurnNode): boolean;

    abstract writeTurnRestriction(restricted: boolean, turnFrom: TurnNode, turnTo: TurnNode);

    abstract readRoutingProvider(location: Feature): string; // return undefined -> provider itself acts as routing provider

    abstract readRoutingPosition(feature): Coordinate;

    abstract readRoutingLink(feature): NavlinkId;

    abstract writeRoutingPosition(feature, position: Coordinate | null);

    abstract writeRoutingLink(location, link: Navlink | null);

    // by default edit states aren't tracked/stored
    abstract writeEditState(feature, editState: 'created' | 'modified' | 'removed' | 'split');

    writeRoutingPoint(location, link: Navlink | null, position: Coordinate | null) {
        this.writeRoutingLink(location, link);
        this.writeRoutingPosition(location, position);
    };

    readRoutingPoint(location): { link: NavlinkId, position: Coordinate } {
        return {
            link: this.readRoutingLink(location),
            position: this.readRoutingPosition(location)
        };
    };

    hooks: Hooks;

    /**
     *  Get features from provider.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.EditableProvider#getFeatures
     *  @param {Array.<String>} ids Array of ids, which will be returned by the functions
     *  @param {Object=} options
     *  @param {Boolean=} options.remote force search function to do remote search.
     *  @param {Funtion=} options.onload callback function to return objects.
     *  @return {Array.<here.xyz.maps.providers.FeatureProvider.Feature>} array of features
     *
     *
     *  @also
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.EditableProvider#getFeatures
     *  @param {Object} options this option should contain at least one of "ids" or "id".
     *  @param {Array.<String>=} options.ids array of ids
     *  @param {String=} options.id a single object id
     *  @param {Boolean=} options.remote force search function to do remote search
     *  @param {Function=} options.onload callback function to return objects
     *  @param {Function=} options.onerror callback function for errors
     *
     *  @return {Array.<here.xyz.maps.providers.FeatureProvider.Feature>} array of features
     */
    getFeatures(ids, options) {
        options = options || {};

        if (!(ids instanceof Array)) {
            if (typeof ids == 'object') {
                if (ids['remote']) {
                    options['remote'] = ids['remote'];
                }
                if (ids['onload']) {
                    options['onload'] = ids['onload'];
                }

                ids = ids['ids'] || ids['id'];
            }

            ids = [].concat(ids);
        }

        const prov = this;
        let cached = true;
        const onload = options['onload'];
        const remote = options['remote'];
        var result = super.getFeatures(ids);

        if (!(result instanceof Array)) {
            result = [result];
        }

        for (let r = 0; r < result.length; r++) {
            if (!result[r]) {
                result[r] = ids[r];
                cached = false;
            }
        }

        function createResult() {
            result = result.map((e) => typeof e == 'object' ? e : UNDEF);

            return result.length == 1
                ? result[0]
                : result;
        }


        if (!cached && remote) {
            ids = result.filter((a) => typeof a != 'object');

            prov._requestFeatures(ids,
                (data) => {
                    let len = data.length;
                    let o;

                    while (len--) {
                        o = data[len];

                        result[result.indexOf(o.id)] = prov.addFeature(o);
                    }

                    if (onload) {
                        onload(createResult());
                    }
                },
                (e) => {
                    const onerror = options['onerror'];

                    if (onerror) {
                        onerror(e);
                    }
                },
                options
            );
        } else {
            var result = createResult();

            if (onload) {
                onload(result);
            }

            return result;
        }
    };

    /* *************** private, required by editEngine *************** */

    /** @internal */
    _e: any;

    isEditable = true;

    isDroppable(feature: Feature | EditorFeature) {
        const editStates = (<EditorFeature>feature).editState && (<EditorFeature>feature).editState();
        return !editStates || (
            !editStates.modified &&
            !editStates.removed &&
            !editStates.split
        );
    }

    getFeatureProperties(feature) {
        return feature.properties;
    }

    detectFeatureClass(feature): FeatureClass {
        return geoToEdit[feature.geometry.type];
    }

    // act as getter/setter
    isoCC(feature, isocc?: string|number) {
        // isoCC always valid -> no reverse geoc
        return true;
    }

    reserveId(createdFeatures, cb) {
        let len = createdFeatures.length;
        const ids = [];
        let id;

        while (len--) {
            id = createdFeatures[len].id;

            if (typeof id == 'string' && id.length > 15) {
                ids.push(createdFeatures[len].id);
            } else {
                ids.push(JSUtils.String.random(16));
            }
        }

        setTimeout(() => {
            cb(ids.reverse());
        }, 0);
    };

    private blocked = {};

    blockFeature(feature, block) {
        const id = feature.id || feature;
        const type = typeof id;

        if (type == 'string' || type == 'number') {
            if (block) {
                this.blocked[id] = true;
            } else {
                delete this.blocked[id];
            }
        }
    };

    _insert(o, tile) {
        if (this.blocked[o.id]) {
            return null;
        }
        return super._insert(o, tile);
    };
}

EditableProvider.prototype.prepareFeature = prepareFeature;
EditableProvider.prototype.updateBBox = updateBBox;

export {EditableProvider};

