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

import oTools from '../oTools';
import {JSUtils} from '@here/xyz-maps-common';
import {Feature as GeoJSONFeature, GeoPoint, providers} from '@here/xyz-maps-core';
import {EditorProperties, DefaultEditorProperties} from './EditorProperties';
import {FeatureProperties} from './Properties';
import InternalEditor from '../../IEditor';
import {Style} from '@here/xyz-maps-core';


type EditableProvider = providers.EditableRemoteTileProvider;
let UNDEF;

const cpyCoord = (c) => {
    return c.length == 3
        ? [c[0], c[1], c[2]]
        : [c[0], c[1]];
};

export type EditStates = 'created' | 'modified' | 'removed' | 'split' | 'hovered' | 'selected';

type Coordinate = [number, number, number?];


class Feature extends GeoJSONFeature {
    bbox: [number, number, number, number];

    id: number | string;

    /**
     * The Properties of the feature
     */
    properties: FeatureProperties;

    // readonly properties: { [name: string]: any };

    geometry: {
        type: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon',
        coordinates: Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][]
    };

    /**
     *  The Feature class of the feature.
     *  The value must be one of "NAVLINK", "ADDRESS", "PLACE", "AREA" or "MARKER".
     */
    class: string;

    constructor(geojsonFeature, provider: EditableProvider) {
        super(geojsonFeature, provider);

        (<any> this).properties['@ns:com:here:editor'] = new DefaultEditorProperties();
    }

    toString() {
        return this.class + ' 🌎 ' + this.id;
    };

    getProvider(): providers.EditableRemoteTileProvider {
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

    // class: null

    /**
     *  Get default or current style of the feature.
     *
     *  @deprecated
     *  @default "default"
     *  @param type - indicates which style to return. "default" -> layer default style for the feature or the "current" applied style.
     *
     *  @return the style of the feature
     */
    style(type: 'default' | 'current'): Style[];
    /**
     *  Apply style to the feature.
     *
     *  @deprecated
     *  @param style - the style to set for the feature
     */
    style(style: Style[]);

    style(styles?: Style[] | 'default' | 'current') {
        const feature = this;

        // act as getter!
        if (typeof styles == 'string' || arguments.length == 0) {
            return this._e().getStyle(feature, UNDEF);
        }
        this._e().setStyle(feature, styles, true);
    };

    /**
     * Get a deep copy of the properties of the feature
     */
    prop(): { [name: string]: any };

    /**
     * Get the value of an specific property
     *
     * @param property - name of the property
     *
     * @return the value of the specific property
     */
    prop(property: string): any;

    /**
     *  Set the value for an specific property
     *
     * @param property - name of the property
     * @param value - the value that should be set for the property
     */
    prop(property: string, value: any): void;

    /**
     *  Set one or more properties of the object.
     *  @param properties - the properties object literal that should be merged with the existing properties.
     */
    prop(properties: { [name: string]: any }): void;

    prop(props?, p?): { [name: string]: any } | void {
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
     *  Get the coordinate(s) of the feature.
     */
    coord(): GeoPoint[] | GeoPoint[][] | GeoPoint[][][] | GeoPoint[][][][];
    /**
     *  Set the coordinate(s) of the feature.
     *
     *  @param coordinates - the coordinates that should be set. The coordinates must match features geometry type.
     */
    coord(coordinates: GeoPoint[] | GeoPoint[][] | GeoPoint[][][] | GeoPoint[][][][]);

    coord(coordinates?: GeoPoint[] | GeoPoint[][] | GeoPoint[][][] | GeoPoint[][][][]) {
        const feature = this;
        const geoType = feature.geometry.type;

        if (coordinates instanceof Array) {
            oTools.deHighlight(feature);

            oTools._setCoords(feature, coordinates);

            oTools.markAsModified(feature);
        } else {
            // coords = feature.geometry.coordinates;
            coordinates = feature.getProvider().decCoord(feature);

            if (geoType == 'Point') {
                coordinates = cpyCoord(coordinates);
            } else {
                coordinates = [];

                const len = coordinates.length;

                for (let c = 0; c < len; c++) {
                    coordinates[c] = cpyCoord(coordinates[c]);
                }
            }
        }

        return coordinates;
    };

    /**
     *  Define if the feature should be editable by the Editor module or not.
     *
     * @param editable - True, the feature can be edited, otherwise false.
     *
     * @deprecated
     * @example
     * ```
     * // prevent the feature from being modified by the editor module
     * object.editable(false);
     * ```
     */
    editable(editable: boolean) {
        oTools._editable(this, editable);
        // this._editable(editable);
        this.unselect();
        return this;
    };

    /**
     *  Select and highlight the feature.
     *  Selected features geometry is displayed and can easily be modified by mouse/touch interaction.
     */
    select() {
        oTools._select(this);
    };

    /**
     *  Unselect the feature.
     */
    unselect() {
        if (oTools.private(this, 'isSelected')) {
            this._e().objects.selection.clearSelected();
        }
    };

    /**
     *  Enable Transform Utility to allow easy geometry transformation of the feature (move/scale/rotate) by mouse/touch interaction.
     */
    transform() {
        this._e().transformer.show(this);
    };

    /**
     *  Remove the feature.
     */
    remove() {
        this._e().objects.remove(this, {
            save: true
        });
    };
}

Feature.prototype.id = null;

export {Feature};
