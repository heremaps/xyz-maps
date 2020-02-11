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

import {JSUtils} from '@here/xyz-maps-common';
import {layers} from '@here/xyz-maps-core';


type EditorOptions = {

    debug: boolean;

    editRestrictions: (feature, restrictionMask: number) => boolean;

    geoFence: number | false;

    minShapeDistance: number;

    autoConnectShapeDistance: number;

    intersectionScale: number;

    XTestMaxDistance: number;

    disconnectShapeDistance: number;

    keepFeatureSelection: string | boolean;

    featureSelectionByDefault: boolean;

    enableHover: boolean;

    maxRoutingPointDistance: number;

    autoSnapShape: boolean;

    services: {
        reverseGeocoder: {
            //  'getISOCC': function(lon, lat, callback){
            //      return 'ISOCC';
            //  }
        }
    };

    layers?: layers.TileLayer[];

    destination: string;

    /** @internal */
    legacy?: boolean
};


/**
 *  Configuration of map edit engine.
 *
 *  @public
 *  @interface
 *  @class
 *  @expose
 *
 *  @example
 *  var config = {
 *      services: {
 *          reverseGeocoder: {
 *              'getISOCC': function(lon, lat, callback){
 *                  // do reverse geocode request to get isocc value
 *                  callback && callback(isocc);
 *              }
 *          }
 *      }
 *  };
 *
 *  @name here.xyz.maps.editor.Editor.Config
 */
const defaultOptions: EditorOptions = {

    'debug': true,

    /**
     *  Callback for editRestriction validation.
     *
     *  @public
     *  @expose
     *  @function
     *  @param {here.xyz.maps.editor.features.Feature} feature
     *      the map feature
     *  @param {number} restriction
     *     restriction number representing a bitmask for the desired edit operations.
     *      1  -> GEOMETRY CHANGE
     *      2  -> REMOVE
     *  @name here.xyz.maps.editor.Editor.Config#editRestrictions
     *  @return {Boolean}
     *      true  -> yes. allow edit.
     *      false -> no. edit won't be executed
     */
    'editRestrictions': function() {
        // NO RESTRICTIONS PER DEFAULT FOR NOW
        return false;
        //    var restrictions = properties['protected'] ? 3 : 0;
        //    return !!(restrictions & checkMask);
    },

    /**
     *  Object specifies setting for backend service.
     *      -reverseGeocoder: define function for accessing 'isocc'.
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.Editor.Config#services
     *  @optional
     *  @type Object
     *
     *  @example
     *  {
     *      reverseGeocoder:
     *      {
     *          'getISOCC': function(lon, lat, callback){
     *              // do reverse geocode request to get isocc value
     *              callback && callback(isocc);
     *          }
     *      }
     *  }
     */
    'services': {
        'reverseGeocoder':
            {
                //  'getISOCC': function(lon, lat, callback){
                //      return 'ISOCC';
                //  }
            }

    },

    // /**
    //  *  object with 'max' and 'min' properties defining the active zoomlevels.
    //  *
    //  *  @public
    //  *  @name here.xyz.maps.editor.Editor.Config.zoomLevel
    //  *  @type Object
    //  */
    // 'zoomLevel': {
    //  'max': 20,
    //  'min': 15
    // },

    'destination': (function getBasePath(name) {
        if (!(name instanceof Array)) name = [name];
        const scripts = document.getElementsByTagName('script');
        const tlc = 'toLowerCase';
        let path = '';
        for (let k = 0; k < name.length; k++) {
            for (let i = scripts.length - 1; i >= 0; --i) {
                const src = scripts[i].src[tlc]();
                const index = src.indexOf(name[k][tlc]());
                if (index >= 0) {
                    path = src.substr(0, index);
                    return path;
                }
            }
        }
        return path;
    })(['mapedit.js']),

    /**
     *  The area a link shape point can be dragged. turn off geoFence by default.
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.Editor.Config#geoFence
     *  @optional
     *  @default false
     *  @type Boolean
     */
    'geoFence': false,

    /**
     *  Minimum distance in meters between two shape points for creating new links.
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.Editor.Config#minShapeDistance
     *  @optional
     *  @default 2
     *  @type number
     */
    'minShapeDistance': 2, // 4meters
    // 'minShapeDistance': 4e-5, // 4meters

    /**
     *  If distance (meters) below value. auto connect shape to existing geometry will be executed.
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.Editor.Config#autoConnectShapeDistance
     *  @optional
     *  @default 2
     *  @type number
     */
    'autoConnectShapeDistance': 2,

    // 'ShapeSnapTolerance': 4e-5, //8


    /**
     *  Numeric scale of WGS coordinates for detecting an intersection.
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.Editor.Config#intersectionScale
     *  @optional
     *  @default 5
     *  @type number
     */
    'intersectionScale': 5,


    /**
     *  Maximum variance for crossing candidate detection in meter
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.Editor.Config#XTestMaxDistance
     *  @optional
     *  @default 2
     *  @type number
     */
    'XTestMaxDistance': 2,

    /**
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.Editor.Config#disconnectShapeDistance
     *  @optional
     *  @default 3
     *  @type number
     */
    'disconnectShapeDistance': 3,

    /**
     *  Keep features selected after mapviewchange or click on ground.
     *  if set to false -> will be cleared after viewport change and click on ground.
     *  if set to "viewportChange" -> will only be cleared on ground click.
     *  if set to true -> no clear at all.
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.Editor.Config#keepFeatureSelection
     *  @optional
     *  @default "viewportChange"
     *  @type {Boolean|string}
     */
    'keepFeatureSelection': 'viewportChange',


    /**
     *  Select feature by default on tap/pointerup event
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.Editor.Config#featureSelectionByDefault
     *  @optional
     *  @default true
     *  @type Boolean
     */
    'featureSelectionByDefault': true,


    'enableHover': true,

    /**
     *  maximum distance of Routing Point in meters
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.Editor.Config#maxRoutingPointDistance
     *  @optional
     *  @default 1000
     *  @type number
     */
    'maxRoutingPointDistance': 1000,

    /**
     *  Enable/disable auto snap to existing link network while dragging link shapes.
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.Editor.Config#autoSnapShape
     *  @optional
     *  @default false
     *  @type Boolean
     */
    'autoSnapShape': false
};


const mergeOptions = (options): EditorOptions => {
    const merged = JSUtils.extend(true, {}, defaultOptions);

    for (const c in options) {
        switch (c) {
        case 'services':
            JSUtils.extend(true, merged[c], options[c]);
            break;

        case 'editRestrictions':
            if (typeof options[c] !== 'function') {
                break;
            }

        default:
            merged[c] = options[c];
        }
    }

    return merged;
};


export {defaultOptions, EditorOptions, mergeOptions};
