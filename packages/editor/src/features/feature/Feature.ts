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

import oTools from '../oTools';
import {JSUtils} from '@here/xyz-maps-common';
import {features, providers} from '@here/xyz-maps-core';
import EditorProperties from './EditorProperties';
import Properties from './Properties';
import InternalEditor from '../../IEditor';

const doc = Properties; // doc only!

const {Feature} = features;
type EditableProvider = providers.EditableProvider;
let UNDEF;

const cpyCoord = (c) => {
    return c.length == 3
        ? [c[0], c[1], c[2]]
        : [c[0], c[1]];
};

export type EditStates = 'created' | 'modified' | 'removed' | 'split' | 'hovered' | 'selected';

type Coordinate = [number, number, number?];

/**
 *  @class
 *  @expose
 *  @public
 *
 *  @extends here.xyz.maps.providers.FeatureProvider.Feature
 *  @name here.xyz.maps.editor.features.Feature
 *
 *  @constructor
 *  @param {(String|Number)=} id
 *      id of the feature
 *  @param {Array.<here.xyz.maps.editor.GeoCoordinate>|Array.<here.xyz.maps.editor.PixelCoordinate>} coordinates
 *      Coordinates of the feature.
 *  @param {here.xyz.maps.editor.features.Feature.Properties=} properties
 *      Properties of the feature.
 */
class EditFeature extends Feature {
    bbox: [number, number, number, number];

    id: number | string;

    properties: {};

    geometry: {
        type: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon',
        coordinates: Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][]
    };

    class: string;

    constructor(geojsonFeature, provider: EditableProvider) {
        super(geojsonFeature, provider);

        this.properties['@ns:com:here:editor'] = new EditorProperties();
    }

    toString() {
        return this.class + ' 🌎 ' + this.id;
    };

    getProvider(): providers.EditableProvider {
        // return super.getProvider();
        return <EditableProvider> this._provider;
    }


    _e(): InternalEditor {
        return (<EditableProvider> this._provider)._e;
    }


    // getBBox = function()
    // {
    //     return this.bbox;
    // };

    private _esu: boolean;

    editState(state: EditStates, value?) {
        const aLen = arguments.length;
        const feature = this;
        const estates = feature.properties['@ns:com:here:editor'];

        if (!aLen) {
            return estates;
        }
        if (aLen == 2) {
            if (this._esu) {
                return;
            }

            if (value) {
                estates[state] = value;
            } else {
                delete estates[state];
            }

            if (state != 'hovered' && state != 'selected') {
                feature._e().objects.history.ignore(() => {
                    feature._esu = true;
                    (<EditableProvider>feature.getProvider()).writeEditState(feature, state);
                    feature._esu = UNDEF;
                });
            }
        }

        return estates[state];
    };

    /**
     *  Feature class of this feature, the value could be one of "NAVLINK", "ADDRESS", "PLACE", "AREA" or "MARKER".
     *
     *  @public
     *  @expose
     *  @readonly
     *  @name here.xyz.maps.editor.features.Feature#class
     *  @type string
     */

    // class: null

    /**
     *  Get default or current style of the feature.
     *
     *  @public
     *  @expose
     *  @deprecated
     *  @param {string=} [style="default"]
     *      a string indicating which style to return, either "default" or "current".
     *  @return {Array<here.xyz.maps.layers.TileLayer.Style>} styles
     *      style of this feature
     *  @function
     *  @name here.xyz.maps.editor.features.Feature#style
     *
     * @also
     *  Apply style to the feature.
     *
     *  @public
     *  @expose
     *  @param {Array<here.xyz.maps.layers.TileLayer.Style>} style
     *      the style to set for the feature
     *  @function
     *  @name here.xyz.maps.editor.features.Feature#style
     */
    style(styles) {
        const feature = this;

        // act as getter!
        if (typeof styles == 'string' || arguments.length == 0) {
            return this._e().getStyle(feature, UNDEF);
        }
        this._e().setStyle(feature, styles, true);
    };

    /**
     *  properties of this feature.
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Feature#properties
     *  @type {here.xyz.maps.editor.features.Feature.Properties}
     */
    // properties: null

    /**
     *  The type of the object, 'NAVLINK', 'ADDRESS', 'PLACE', 'AREA', 'MARKER' or 'LINE'.
     *
     *  @public
     *  @expose
     *  @readonly
     *  @type string
     */
    // type = null;

    /**
     *  Id of the Object
     *
     *  @public
     *  @expose
     *  @readonly
     *  @type string|number
     */

    /**
     *  Guid of the Object
     *
     *  @public
     *  @expose
     *  @readonly
     *  @type string
     */
    // guid = null;
    /**
     *  Id of the layer the Object belongs to
     *
     *  @public
     *  @expose
     *  @readonly
     *  @type string
     */
    // layerId = null;
    /**
     *  Timestamp of last update
     *
     *  @public
     *  @expose
     *  @readonly
     *  @type number
     */
    // lastUpdateTS = null;
    /**
     *
     *  Initial state information of the Object.
     *  An array representing 4 main states: Changing, Moderating, Publishing and Merging.
     *  Changing-State can be one of: "CREATED", "UPDATED", "REMOVED" and "SPLIT".
     *
     *  @public
     *  @expose
     *  @readonly
     *  @type array
     */
    // states = null;
    /**
     *  Timestamp of creation
     *
     *  @public
     *  @expose
     *  @readonly
     *  @type number
     */

    // createdTS = null;


    /**
     *  Get deep copy of all properties of the feature
     *
     *  @public
     *  @expose
     *  @return {here.xyz.maps.editor.features.Feature.Properties}
     *      return properties of the object
     *  @function
     *  @name here.xyz.maps.editor.features.Feature#prop
     *
     *
     * @also
     *
     *  Get the value of an specific property
     *
     *  @public
     *  @expose
     *  @param {string} property
     *      property name
     *  @return {number|string|Array.<string>|object}
     *      value of the specific property
     *  @function
     *  @name here.xyz.maps.editor.features.Feature#prop
     *
     * @also
     *
     *  Set the value for an specific property
     *
     *  @public
     *  @expose
     *  @param {string} property
     *      property name
     *  @param {number|string|Array.<string>|object} value
     *      value of the specific property
     *  @function
     *  @name here.xyz.maps.editor.features.Feature#prop
     *
     *
     * @also
     *
     *  Set one or more properties of the object.
     *
     *  @public
     *  @expose
     *  @param {here.xyz.maps.editor.features.Feature.Properties} properties
     *      properties of the feature
     *  @function
     *  @name here.xyz.maps.editor.features.Feature#prop
     *
     */
    prop(props?) {
        const feature = this;
        let isModified = false;
        const aLen = arguments.length;
        const properties = (<EditableProvider>feature.getProvider()).getFeatureProperties(feature);

        // act as getter
        if (!aLen || aLen == 1 && typeof props == 'string') {
            props = props ? properties[props] : properties;

            return typeof props == 'object'
                ? JSUtils.extend(true, new props.constructor(), props)
                : props;
        }

        if (aLen == 2) {
            const p = {};
            p[props] = arguments[1];
            props = p;
        }

        for (const key in props) {
            const value = props[key];
            const isObj = typeof value == 'object';
            const curValue = properties[key];

            if (
                isObj && JSON.stringify(value) != JSON.stringify(curValue) ||
                !isObj && curValue !== value
            ) {
                if (!isModified) {
                    // first modify
                    this._e().objects.history.origin(feature);
                    isModified = true;
                }

                properties[key] = value;
            }
        }

        if (isModified) {
            this._e().setStyle(feature);

            oTools.markAsModified(feature);
        }
    };


    getCoordinates() {
        return this.coord();
    };

    /**
     *  Get coordinate(s) of the feature.
     *
     *  @public
     *  @expose
     *  @return {Array.<Array>|Array.<number>}
     *      coordinates of the feature, it is either array of coordinates: [longitude, latitude, z] or
     *      array of coordinate arrays: [ [longitude, latitude, z], [longitude, latitude, z], , , , ] depending on the type of feature.
     *  @function
     *  @name here.xyz.maps.editor.features.Feature#coord
     *
     * @also
     *  Set coordinate(s) of the feature.
     *
     *  @public
     *  @param {Array.<Array>|Array.<number>} coords
     * coordinates of the feature, it is either array of coordinates: [longitude, latitude, z] or
     *      array of coordinate arrays: [ [longitude, latitude, z], [longitude, latitude, z], , , , ] depending on the type of feature.
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Feature#coord
     */
    coord(coords?) {
        const feature = this;
        const geoType = feature.geometry.type;
        let coordinates;

        if (coords instanceof Array) {
            oTools.deHighlight(feature);

            oTools._setCoords(feature, coords);

            oTools.markAsModified(feature);
        } else {
            // coords = feature.geometry.coordinates;
            coords = feature.getProvider().decCoord(feature);

            if (geoType == 'Point') {
                coordinates = cpyCoord(coords);
            } else {
                coordinates = [];

                const len = coords.length;

                for (let c = 0; c < len; c++) {
                    coordinates[c] = cpyCoord(coords[c]);
                }
            }
        }

        return coordinates;
    };


    /**
     *  Set the object editable or read only.
     *
     *  @public
     *  @expose
     *  @param {Boolean} editable
     *      True, the object is editable. false, the object is read only.
     *
     *  @example
     *  object.editable(false); // set the object read only
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Feature#editable
     */
    editable(editable: boolean) {
        oTools._editable(this, editable);
        // this._editable(editable);
        this.unselect();
        return this;
    };


    /**
     *  Highlight and selects this object.
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Feature#select
     */
    select() {
        oTools._select(this);

        // if( obj._select )
        // {
        //    obj._select();
        // }
    };

    /**
     *  Unselect the object, unhightlight it.
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Feature#unselect
     */
    unselect() {
        // oTools.deHighlight(this, true);
        if (oTools.private(this, 'isSelected')) {
            this._e().objects.selection.clearSelected();

            // if( this.deHighlight )s
            // {
            //     this.deHighlight( true );
            // }

            // clear multi selected links if exists
            // this._e().map.multiSelector.hide();
        }
    };

    /**
     *  Helper function to transform the object (move/scale/rotate)
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Feature#transform
     */
    transform() {
        this._e().transformer.show(this);
    };

    /**
     *  Remove the object.
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Feature#remove
     */
    remove() {
        this._e().objects.remove(this, {
            save: true
        });
    };
}

EditFeature.prototype.id = null;

export default EditFeature;
