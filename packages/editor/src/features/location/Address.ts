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

import oTools from './LocationTools';
import Location from './Location';
import {JSUtils} from '@here/xyz-maps-common';

/**
 *  Get deep copy of all properties of the feature
 *
 *  @public
 *  @expose
 *  @return {here.xyz.maps.editor.features.Address.Properties}
 *      return properties of the object
 *  @function
 *  @name here.xyz.maps.editor.features.Address#prop
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
 *  @name here.xyz.maps.editor.features.Address#prop
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
 *  @name here.xyz.maps.editor.features.Address#prop
 *
 *
 * @also
 *
 *  Set one or more properties of the object.
 *
 *  @public
 *  @expose
 *  @param {here.xyz.maps.editor.features.Address.Properties} properties
 *      properties of the feature
 *  @function
 *  @name here.xyz.maps.editor.features.Address#prop
 *
 */

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
 *  @name here.xyz.maps.editor.features.Address#style
 *
 * @also
 *  Apply style to the feature.
 *
 *  @public
 *  @expose
 *  @param {Array<here.xyz.maps.layers.TileLayer.Style>} style
 *      the style to set for the feature
 *  @function
 *  @name here.xyz.maps.editor.features.Address#style
 */

/**
 *  Get coordinate of the feature.
 *
 *  @public
 *  @expose
 *  @return {Array.<number>}
 *      coordinate of the feature: [longitude, latitude, z]
 *  @function
 *  @name here.xyz.maps.editor.features.Address#coord
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
 *  @name here.xyz.maps.editor.features.Address#coord
 */

/**
 *  Properties of address feature.
 *
 *  @public
 *  @expose
 *  @type {here.xyz.maps.editor.features.Address.Properties}
 *  @name here.xyz.maps.editor.features.Address#properties
 */

/**
 *  Feature class of this feature, the value is "ADDRESS".
 *
 *  @public
 *  @expose
 *  @readonly
 *  @name here.xyz.maps.editor.features.Address#class
 *  @type string
 */

/**
 *  @class
 *  @expose
 *  @public
 *
 *  @extends here.xyz.maps.editor.features.Marker
 *  @name here.xyz.maps.editor.features.Address
 *  @constructor
 *  @param {(String|Number)=} id of the Address
 *  @param {here.xyz.maps.editor.GeoCoordinate|here.xyz.maps.editor.PixelCoordinate} coordinate
 *      Coordinate of the feature.
 *  @param {here.xyz.maps.editor.features.Feature.Properties=} properties
 *      Properties of the address feature.
 */
class Address extends Location {
    class: 'ADDRESS';

    // constructor(feature, provider) {
    //     super(feature, provider);
    // }


    /**
     *  Get the link to which the point address is attached.
     *
     *  @public
     *  @expose
     *  @return {here.xyz.maps.editor.features.Navlink}
     *      The link to which the point address is attached.
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Address#getLink
     */
    // TODO: cleanup doc + real inheritance chain..


    prop(props) {
        const feature = this;
        let isModified = false;
        const aLen = arguments.length;
        const properties = feature.getProvider().getFeatureProperties(feature);

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


        // in case of routingpoint properties have changed, make sure connection is created or updated.
        oTools.connect(feature, null);


        if (isModified) {
            feature._e().setStyle(feature);

            oTools.markAsModified(feature);
        }
    };
}

Address.prototype.class = 'ADDRESS';

export default Address;
