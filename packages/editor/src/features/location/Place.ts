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

import oTools from './LocationTools';
import {Location} from './Location';
import {JSUtils} from '@here/xyz-maps-common';

/**
 *  @class
 *  @expose
 *  @public
 *
 *  @extends here.xyz.maps.editor.features.Marker
 *  @name here.xyz.maps.editor.features.Place
 *
 *  @constructor
 *  @param {(String|Number)=} id of the Place
 *  @param {here.xyz.maps.editor.GeoCoordinate|here.xyz.maps.editor.PixelCoordinate} coordinate
 *      Coordinate of the feature
 *  @param {here.xyz.maps.editor.features.Feature.Properties=} properties
 *      Properties of the Place feature.
 */
class Place extends Location {
    /**
     *  The feature class of a Place is "PLACE".
     */
    readonly class: 'PLACE';

    constructor(feature, provider) {
        super(feature, provider);
    }

    /**
     *  Get the link to which the POI is attached.
     *
     *  @public
     *  @expose
     *  @return {here.xyz.maps.editor.features.Navlink}
     *      The link to which the POI is attached.
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Place#getLink
     */

    // TODO: cleanup doc + real inheritance chain..

    /**
     *  Find the nearest routing point and assign it to this POI.
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Place#createRoutingPoint
     */
    createRoutingPoint() {
        const obj = this;

        if (!oTools.getRoutingData(obj).link) {
            oTools.connect(obj);

            if (oTools.getRoutingData(obj).link) {
                oTools.markAsModified(obj);
            }
        }
    };

    /**
     *  Remove the existing routing point for this POI
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Place#removeRoutingPoint
     */
    removeRoutingPoint() {
        const obj = this;

        if (oTools.getRoutingData(obj).link) {
            oTools.disconnect(obj);

            oTools.markAsModified(obj);
        }
    };


    prop(): { [name: string]: any };
    prop(property: string): any;
    prop(property: string, value: any): void;
    prop(properties: { [name: string]: any }): void;
    prop(props?, p?): { [name: string]: any } | void {
        const feature = this;
        const aLen = arguments.length;
        const properties = feature.getProvider().getFeatureProperties(feature);
        let isModified = false;

        // act as getter
        if (!aLen || aLen == 1 && typeof props == 'string') {
            props = props ? properties[props] : properties;

            return props != null && typeof props == 'object'
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
                    feature._e().objects.history.origin(feature);
                    isModified = true;
                }

                properties[key] = value;
            }
        }

        // connect to a link if this object has link property, if not, disconnect possible previous connection.
        if (oTools.getRoutingData(feature).link) {
            oTools.connect(feature, null);
        } else {
            oTools.disconnect(feature);
        }


        if (isModified) {
            feature._e().setStyle(feature);

            oTools.markAsModified(feature);
        }
    };
}

(<any>Place.prototype).class = 'PLACE';

/**
 *  Get default or current style of the feature.
 *
 *  @public
 *  @expose
 *  @param {string=} [style="default"]
 *      a string indicating which style to return, either "default" or "current".
 *  @return {Array<here.xyz.maps.layers.TileLayer.Style>} styles
 *      style of this feature
 *  @function
 *  @name here.xyz.maps.editor.features.Place#style
 *
 * @also
 *  Apply style to the feature.
 *
 *  @public
 *  @expose
 *  @param {Array<here.xyz.maps.layers.TileLayer.Style>} style
 *      the style to set for the feature
 *  @function
 *  @name here.xyz.maps.editor.features.Place#style
 */

/**
 *  Get coordinate of the feature.
 *
 *  @public
 *  @expose
 *  @return {Array.<number>}
 *      coordinate of the feature: [longitude, latitude, z]
 *  @function
 *  @name here.xyz.maps.editor.features.Place#coord
 *
 * @also
 *  Set coordinate of the feature.
 *
 *  @public
 *  @param {Array.<number>} coords
 *  coordinate of the feature: [longitude, latitude, z]
 *  @expose
 *
 *  @function
 *  @name here.xyz.maps.editor.features.Place#coord
 */

export {Place};
