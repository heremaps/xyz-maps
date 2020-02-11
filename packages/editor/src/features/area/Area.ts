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

import oTools from './PolygonTools';
import BasicFeature from '../feature/Feature';

const MIN_HOLE_SIZE = 8;

const throwError = (msg) => {
    throw new Error(msg);
};


const copyCoord = (c: [number, number, number?]) => {
    return c.length == 3
        ? [c[0], c[1], c[2]]
        : [c[0], c[1]];
};

const copyPolygon = (poly) => {
    const cpy = [];
    for (let l = 0; l < poly.length; l++) {
        const linestring = poly[l];
        const ls = cpy[cpy.length] = [];

        for (let i = 0; i < linestring.length; i++) {
            ls[i] = copyCoord(linestring[i]);
        }
    }
    return cpy;
};


/**
 *  @class
 *  @public
 *  @expose
 *
 *  @extends here.xyz.maps.editor.features.Feature
 *  @name here.xyz.maps.editor.features.Area
 *
 *  @constructor
 *  @param {(String|Number)=} id of the Area
 *  @param {Array.<here.xyz.maps.editor.GeoCoordinate>|Array.<here.xyz.maps.editor.PixelCoordinate>} coordinates
 *      Coordinates of the feature
 *  @param {here.xyz.maps.editor.features.Feature.Properties=} properties
 *      Properties of the area feature.
 */
class Area extends BasicFeature {
    class: 'AREA';

    /**
     *  Get coordinates of the feature.
     *
     *  @public
     *  @expose
     *  @return {Array.<Array>}
     *      coordinates of the feature:[ [ [ [longitude, latitude, z], [longitude, latitude, z], , , , ] ] ].
     *  @function
     *  @name here.xyz.maps.editor.features.Area#coord
     *
     * @also
     *  Set coordinates of the feature.
     *
     *  @public
     *  @param {Array.<Array>} coords
     *      coordinates of the feature:[ [ [ [longitude, latitude, z], [longitude, latitude, z], , , , ] ] ].
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Area#coord
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
            coords = feature.getProvider().decCoord(feature);

            if (geoType == 'Polygon') {
                coordinates = copyPolygon(coords);
            } else {
                coordinates = [];
                for (let p = 0; p < coords.length; p++) {
                    coordinates[p] = copyPolygon(coords[p]);
                }
            }
        }
        return coordinates;
    };

    /**
     *    Add a new shape point to the area.
     *
     *    @public
     *    @expose
     *    @param {here.xyz.maps.editor.PixelCoordinate} point
     *        the coordinate of the new shape.
     *    @param {Number=} polygon index
     *        the index of the polygon to add the shape.
     *    @param {Number=} index
     *        the index of the polygon shapes to insert.
     *    @return {boolean|number}
     *        shape index of polygon or false if could not be added
     *    @function
     *    @name here.xyz.maps.editor.features.Area#addShape
     */
    addShape(mPos, polyIdx, index) {
        let added: number|boolean = false;

        mPos = this._e().map.getGeoCoord(mPos);

        if (!mPos) {
            throwError('missing coordinate');
        } else {
            if (arguments.length == 1) {
                polyIdx = oTools.getPoly(this, mPos);
            }

            if ((added = oTools.addShp(this, mPos, polyIdx ^ 0, 0, index)) !== false) {
                oTools.markAsModified(this);
            }
        }


        return added;
    };


    addHole(position) {
        if (position) {
            position = this._e().map.getPixelCoord(position);

            const area = this;
            const polyIdx = oTools.getPoly(area, position);
            const coordinates = oTools.getCoords(area);
            const polygon = coordinates[polyIdx];
            let width = Infinity;

            for (let p = 0; p < polygon.length; p++) {
                const w = oTools.getMaxSpace(area, position, polygon[p]);
                if (w < width) {
                    width = w;
                }
            }

            width = Math.floor(width * .5);

            if (width > MIN_HOLE_SIZE) {
                const x = position[0];
                const y = position[1];
                const hole = [

                    [x - width, y + width],
                    [x + width, y + width],
                    [x + width, y - width],
                    [x - width, y - width],
                    [x - width, y + width]

                ].map((p: [number, number]) => this._e().map.getGeoCoord(p));

                if (!oTools.isClockwise(polygon[0])) {
                    hole.reverse();
                }

                polygon.push(hole);

                oTools._setCoords(area, coordinates, true);

                oTools.markAsModified(area);
            }
        }
    };
}

const AREA_PROTOTYPE = Area.prototype;

/**
 *  Get deep copy of all properties of the feature
 *
 *  @public
 *  @expose
 *  @return {here.xyz.maps.editor.features.Area.Properties}
 *      return properties of the object
 *  @function
 *  @name here.xyz.maps.editor.features.Area#prop
 *
 *
 *  @also
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
 *  @name here.xyz.maps.editor.features.Area#prop
 *
 *  @also
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
 *  @name here.xyz.maps.editor.features.Area#prop
 *
 *
 *  @also
 *
 *  Set one or more properties of the object.
 *
 *  @public
 *  @expose
 *  @param {here.xyz.maps.editor.features.Area.Properties} properties
 *      properties of the feature
 *  @function
 *  @name here.xyz.maps.editor.features.Area#prop
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
 *  @name here.xyz.maps.editor.features.Area#style
 *
 *  @also
 *  Apply style to the feature.
 *
 *  @public
 *  @expose
 *  @param {Array<here.xyz.maps.layers.TileLayer.Style>} style
 *      the style to set for the feature
 *  @function
 *  @name here.xyz.maps.editor.features.Area#style
 */

/**
 *  Feature class of this feature, the value is "AREA".
 *
 *  @public
 *  @expose
 *  @readonly
 *  @name here.xyz.maps.editor.features.Area#class
 *  @type string
 */
AREA_PROTOTYPE.class = 'AREA';


export default Area;
