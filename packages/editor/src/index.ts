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

import {JSUtils, global} from '@here/xyz-maps-common';
import SObj from './features/feature/Feature';
import Editor from './API/Editor';
import FeatureEditStates from './features/feature/EditorProperties';

import Place from './features/location/Place';
import Address from './features/location/Address';
import Link from './features/link/NavLink';
import Line from './features/line/Line';
import Area from './features/area/Area';
import Marker from './features/marker/Marker';

const NAVLINK = 'NAVLINK';
const AREA = 'AREA';
const MARKER = 'MARKER';
const PLACE = 'PLACE';
const ADDRESS = 'ADDRESS';
const LINE = 'LINE';
const LONGITUDE = 'longitude';
const LATITUDE = 'latitude';

const objectTypeMapping = {};

let CONFIG;
let UNDEF;

objectTypeMapping[NAVLINK] = 'Navlink';
objectTypeMapping[AREA] = 'Area';
objectTypeMapping[PLACE] = 'Place';
objectTypeMapping[ADDRESS] = 'Address';
objectTypeMapping[MARKER] = 'Marker';
objectTypeMapping[LINE] = 'Line';


/**
 *    A class representing map objects, including 'Link', 'Area', 'POI', 'Address' and 'Marker'.
 */
export const features = ((() => {
    function createObjDef(objType) {
        const toGeojsonCoordinates = (coordinates) => {
            let x = coordinates.x != UNDEF ? coordinates.x
                : coordinates.longitude != UNDEF ? coordinates.longitude
                    : coordinates[0];

            if (typeof x == 'number') {
                return coordinates;
            }
            const cpy = [];

            for (let c of coordinates) {
                cpy[cpy.length] = toGeojsonCoordinates(c);
            }
            return cpy;
        };

        function Obj(id, coords, properties) {
            const that = this;

            if (typeof id != 'number' && typeof id != 'string') {
                properties = coords;
                coords = id;
            } else {
                that.id = id;
            }

            that.type = 'Feature';

            that.class = objType;

            that.properties = JSUtils.extend({
                '@ns:com:here:editor': new FeatureEditStates()
            }, properties || {});

            that.geometry = {

                type: (objType == 'PLACE' || objType == 'ADDRESS' || objType == 'MARKER')
                    ? 'Point'
                    : objType == 'AREA'
                        ? 'MultiPolygon'
                        : 'LineString',

                coordinates: toGeojsonCoordinates(coords)
            };
        }

        Obj.prototype = SObj.prototype;

        return Obj;
    };

    const objects = {};

    for (const t in objectTypeMapping) {
        objects[objectTypeMapping[t]] = createObjDef(t);
    }

    return objects;
}))();


/**
 *    A class representing a pixel coordinate.
 *    Pass in x, y coordinates in pixel.
 *
 *    @public
 *    @class
 *    @expose
 *    @constructor
 *    @param {Number} x
 *        pixel coordinate in x axis.
 *    @param {Number} y
 *        pixel coordinate in y axis.
 *    @param {Number=} z
 *        ZLevel
 *
 *    @name here.xyz.maps.editor.PixelCoordinate
 */
export const PixelCoordinate = function(x, y, z) {
    /**
     *    pixel coordinate in x axis.
     *
     *    @public
     *    @expose
     *    @readonly
     *
     *  @type {number}
     *
     *  @name here.xyz.maps.editor.PixelCoordinate#x
     */
    this['x'] = x;

    /**
     *    pixel coordinate in y axis.
     *
     *    @public
     *    @expose
     *    @readonly
     *
     *    @type {number}
     *
     *  @name here.xyz.maps.editor.PixelCoordinate#y
     */
    this['y'] = y;

    /**
     *    ZLevel
     *
     *    @public
     *    @expose
     *    @readonly
     *
     *    @type {number}
     *
     *  @name here.xyz.maps.editor.PixelCoordinate#z
     */
    this['z'] = z || 0;
};

/**
 *    A class representing a WGS coordinate.
 *    Pass in longitude and latitude.
 *
 *    @class
 *    @public
 *    @expose
 *    @constructor
 *    @param {Number} lon
 *        longitude.
 *    @param {Number} lat
 *        latitude.
 *    @param {Number=} z
 *        ZLevel
 *
 *    @name here.xyz.maps.editor.GeoCoordinate
 */
export const GeoCoordinate = function(lon, lat, z) {
    /**
     *    longitude coordinate.
     *
     *    @public
     *    @expose
     *    @readonly
     *    @type {Number}
     *  @name here.xyz.maps.editor.GeoCoordinate.prototype.longitude
     */
    this[LONGITUDE] = lon;

    /**
     *    latitude coordinate.
     *
     *    @public
     *    @expose
     *    @readonly
     *    @type {Number}
     *  @name here.xyz.maps.editor.GeoCoordinate.prototype.latitude
     */
    this[LATITUDE] = lat;

    /**
     *    ZLevel
     *
     *    @public
     *    @expose
     *    @readonly
     *
     *
     *    @type {Number}
     *
     *  @name here.xyz.maps.editor.GeoCoordinate.prototype.z
     */
    this['z'] = z || 0;
};

export {Editor};


const dns = 'here.xyz.maps.editor'.split('.');
let scp = global;

for (let i = 0; i < dns.length - 1; i++) {
    scp = scp[dns[i]] = scp[dns[i]] || {};
}

const editor = scp[dns.pop()] = {
    Editor: Editor,
    features: features,
    PixelCoordinate: PixelCoordinate,
    GeoCoordinate: GeoCoordinate
};


const providers = global.here['xyz']['maps']['providers'];
// TODO: remove HACK required for geospace provider being editable...
providers.EditableProvider.prototype.getFeatureClass = function(feature) {
    switch (this.detectFeatureClass(feature)) {
    case 'NAVLINK':
        return Link;
    case 'PLACE':
        return Place;
    case 'ADDRESS':
        return Address;
    case 'AREA':
        return Area;
    case 'MARKER':
        return Marker;
    case 'LINE':
        return Line;
    default:
        return this.Feature;
    }
};

export default editor;
