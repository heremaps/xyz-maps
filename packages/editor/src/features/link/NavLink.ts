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

import CrossingTester from '../../tools/CrossingTester';
import TurnRestriction from './TurnRestriction';
import TurnRestrictionEditor from '../../tools/turnrestriction/Editor';
import DirectionHint from '../../tools/DirectionHint';
import oTools from './NavLinkTools';
import BasicFeature from '../feature/Feature';
import {JSUtils} from '@here/xyz-maps-common';

let UNDEF;

const throwError = (msg) => {
    throw new Error(msg);
};

/** ********************************************************************************************************************/


/**
 *  @class
 *  @expose
 *  @public
 *
 *  @extends here.xyz.maps.editor.features.Feature
 *  @name here.xyz.maps.editor.features.Navlink
 *
 *  @constructor
 *  @param {(String|Number)=} id of the navlink
 *  @param {Array.<here.xyz.maps.editor.GeoCoordinate>|Array.<here.xyz.maps.editor.PixelCoordinate>} coordinates
 *      Coordinates of the navlink.
 *  @param {here.xyz.maps.editor.features.Feature.Properties=} properties
 *      Properties of the navlink.
 */
class Navlink extends BasicFeature {
    id: string | number;

    class: 'NAVLINK';

    // constructor(feature) {
    //     BasicFeature.apply(this, arguments);
    // }

    /**
     *  Checks for possible crossings with other links.
     *
     *  @public
     *  @expose
     *  @function
     *  @param {Object=} option
     *  @param {String=} option.class Class of crossing (CROSSING|CROSSING_CANDIDATE) to check for
     *  @param {Object=} option.styles display style of crossings. 6 configurable styling objects('connector1', 'connector2', 'connector3', 'search1', 'search2', 'found') comprise a crossing
     *
     *  @return {Array<here.xyz.maps.editor.features.Crossing>}
     *      array of found crossings
     *  @name here.xyz.maps.editor.features.Navlink#checkCrossings
     *
     *  @example
     *      crossing.checkCrossings({
     *          type: "CROSSING",
     *          styles: {
     *              'connector1': {fill: 'black'},
     *              'connector2': {stroke: '#FBF'}
     *          }
     *      })
     */
    checkCrossings(option) {
        const obj = this;
        const prv = oTools.private(obj);
        const xTester = prv.xt || new CrossingTester(obj._e(), obj);

        prv.xt = xTester;

        return xTester.getCrossings(option);
    };


    /**
     *  Show or hide the direction hint on this navlink.
     *  If no direction argument is passed the hint will be hidden.
     *
     *  @public
     *  @expose
     *  @param {String=} dir
     *      direction of the link, possible value: "BOTH"|"START_TO_END"|"END_TO_START"
     *  @param {Boolean=} hideShapes
     *      indicates if the shapes are hidden
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink#showDirectionHint
     */
    showDirectionHint(dir?: string, hideShapes?: boolean) {
        // support/fallback for deprecated dir
        dir = {
            'B': 'BOTH',
            'F': 'START_TO_END',
            'T': 'END_TO_START',
            'N': 'BLOCKED'
        }[dir] || dir;


        const obj = this;
        const prv = oTools.private(obj);
        const dirHint = prv.dh;

        if (dirHint) {
            dirHint.destroy();
        }

        prv.dh = dir && new DirectionHint(this._e().objects.overlay, obj, dir, hideShapes);
    };

    /**
     *  Sets geofence radius, it takes an integer as parameter.
     *
     *  @public
     *  @expose
     *  @param {number} radius
     *      The geofence radius.
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink#setGeoFence
     */
    setGeoFence = (r) => {
        if (isNaN(r) || r < 0) {
            throwError('Geofence radius should be a positive Number');
        }

        this._e()._config['geoFence'] = +r;
    };

    /**
     *  Add a new shape point to the link.
     *
     *  @public
     *  @expose
     *  @param {here.xyz.maps.editor.PixelCoordinate} p
     *      the object containing a coordinate.
     *  @param {Number=} index
     *      the position where new shape point should be inserted.
     *  @return {boolean|number} isAdded
     *      index of shape or false if could not be added
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink#addShape
     */
    addShape(mPos, index?: number) {
        let added = false;
        const link = this;

        mPos = this._e().map.getGeoCoord(mPos);

        if (!mPos) {
            throwError('missing pixel coordinate');
        } else if ((added = oTools.addShp(link, mPos, index, UNDEF, true)) !== false) {
            oTools.markAsModified(link);
        }


        return added;
    };

    /**
     *  Get connected links of node.
     *
     *  @public
     *  @expose
     *  @param {number} index
     *      coordinate index of shape/node
     *  @param {boolean=} details
     *      flag to enable detailed connected link information.
     *  @return {Array.<here.xyz.maps.editor.features.Navlink>|Array.<{link: here.xyz.maps.editor.features.Navlink, index: number}>}
     *      Array of connected navlink features or Array of detailed connected link information including the shape/node index of connected link.
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink#getConnectedLinks
     */
    getConnectedLinks(index: number, details?: false): Navlink[];
    getConnectedLinks(index: number, details: true): { link: Navlink, index: number }[];
    getConnectedLinks(index: number, details: boolean = false) {
        const line = this;
        const EDITOR = line._e();
        const path = line.coord();
        const c2 = path[index];
        const cLinks = [];
        let elPath;
        let lastIndex;
        const isNode = index == 0 || index == path.length - 1;

        if (isNode /*  &&!line.editState('removed')*/) {
            for (let feature of EDITOR.objects.getInBBox(line.bbox, line.getProvider())) {
                if (feature.id != line.id && feature.class == 'NAVLINK') {
                    elPath = feature.coord();
                    lastIndex = elPath.length - 1;

                    index = oTools.isIntersection(EDITOR, elPath[0], c2)
                        ? 0
                        : oTools.isIntersection(EDITOR, elPath[lastIndex], c2)
                            ? lastIndex
                            : null;

                    if (index != null /* && zLevels[shpIndex] == curEl.getZLevels()[index]*/) {
                        cLinks.push(details ? {
                            index: index,
                            link: feature
                        } : feature);
                    }
                }
            }
        }
        return cLinks;


        // const connections = oTools.getCLinksForShape(this, index);
        // if (details) {
        //     return connections.map((clink) => {
        //         return {link: clink.link, index: clink.shp};
        //     });
        // } else {
        //     return connections.map((clink) => clink.link);
        // }
    };

    /**
     *  Get the z-levels of the coordinates of this object.
     *
     *  @public
     *  @expose
     *  @return {Array.<number>}
     *      The z-levels of the coordinates of this object.
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink#getZLevels
     */
    getZLevels() {
        const coords = this.geometry.coordinates;
        let len = coords.length;
        const zLevels = [];

        while (len--) {
            zLevels[len] = coords[len][2] || 0;
        }

        return zLevels;
    };


    /**
     *  Set the z-levels of the coordinates of this object. For each coordinate the levels array must contain one
     *  integer between -4 and +5.
     *
     *  @public
     *  @expose
     *  @param {Array.<number>} levels
     *      The z-levels to be set for the coordinates of this object.
     *
     *  @example
     *  var zlevels = navlink.getZLevels();
     *  zlevels[1] = -4;
     *  navlink.setZLevels(zlevels);
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink#setZLevels
     */
    setZLevels(level) {
        const zLevels = this.getZLevels();
        const len = zLevels.length;

        if (!(level instanceof Array)) {
            throwError('Invalid \'zlevel\' argument given, no array');
        }

        if (level.length !== len) {
            throwError('Given \'zlevel\' argument is of an invalid size, a length of ' + len + ' is required!');
        }

        this._e().objects.history.origin(this);

        const coords = this.geometry.coordinates;
        let updated = false;

        for (let l = 0, z; l < level.length; l++) {
            z = level[l] ^ 0;

            if (z != coords[l][2]) {
                coords[l][2] = z;
                updated = true;
            }
        }

        if (updated) {
            // update zlevel visuals
            oTools.refreshGeometry(this);

            oTools.markAsModified(this);
        }
    };

    /**
     *  Show turn restrictions of shape points on selected link.
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @param {number=} shapeIndex
     *      shapeindex of node to display turn restrictions.
     *      if no index is defined turn restrictions for start and end node will be displayed.
     *  @name here.xyz.maps.editor.features.Navlink#editTurnRestrictions
     *  @return {Array<here.xyz.maps.editor.features.TurnRestriction>}
     *      Array of turn restrictions for start and end shape points (nodes) respectively.
     */
    editTurnRestrictions(idx) {
        const link = this;
        const p = link.coord();
        const idxs = (idx == 0 || idx == p.length - 1)
            ? [idx]
            : idx === UNDEF
                ? [0, p.length - 1]
                : [];
        const publicTR = [];
        const EDITOR = link._e();

        EDITOR.listeners.trigger('_clearOverlay');

        for (var i = 0; i < idxs.length; i++) {
            let turnResEditor = new TurnRestrictionEditor(EDITOR);
            turnResEditor.showRestrictions(link, idxs[i]);
            publicTR.push(new TurnRestriction(turnResEditor));
        }

        return publicTR;
    };

    prop(name?: string | {}, value?) {
        const feature = this;
        const EDITOR = feature._e();
        let isModified = false;
        const aLen = arguments.length;
        const properties = feature.getProvider().getFeatureProperties(feature);

        // act as getter
        if (aLen == 0 || aLen == 1 && typeof name == 'string') {
            let props = name ? properties[<string>name] : properties;
            // props = props && properties[props] || properties;

            return typeof props == 'object'
                ? JSUtils.extend(true, new props.constructor(), props)
                : props;
        }

        let props = <{}>name;

        if (aLen == 2) {
            const p = {};
            p[<string>name] = arguments[1];
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
                if (!isModified) {// first modify
                    EDITOR.objects.history.origin(feature);
                    isModified = true;
                }

                properties[key] = value;
            }
        }

        if (isModified) {
            EDITOR.setStyle(feature);

            // in case of direction might have changed -> we update the direction
            if (feature.editState('selected')) {
                oTools.showDirection(feature);
            }

            oTools.markAsModified(feature);
        }
    };

    /**
     *  Properties of link feature.
     *
     *  @public
     *  @expose
     *  @type {here.xyz.maps.editor.features.Navlink.Properties}
     *  @name here.xyz.maps.editor.features.Navlink#properties
     */

    /**
     *  Get deep copy of all properties of the feature
     *
     *  @public
     *  @expose
     *  @return {here.xyz.maps.editor.features.Navlink.Properties}
     *      return properties of the object
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink#prop
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
     *  @name here.xyz.maps.editor.features.Navlink#prop
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
     *  @name here.xyz.maps.editor.features.Navlink#prop
     *
     *
     * @also
     *
     *  Set one or more properties of the object.
     *
     *  @public
     *  @expose
     *  @param {here.xyz.maps.editor.features.Navlink.Properties} properties
     *      properties of the feature
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink#prop
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
     *  @name here.xyz.maps.editor.features.Navlink#style
     *
     * @also
     *  Apply style to the feature.
     *
     *  @public
     *  @expose
     *  @param {Array<here.xyz.maps.layers.TileLayer.Style>} style
     *      the style to set for the feature
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink#style
     */

    /**
     *  Get coordinates of the feature.
     *
     *  @public
     *  @expose
     *  @return {Array.<Array>}
     *      coordinates of the feature:[ [longitude, latitude, z], [longitude, latitude, z], , , , ].
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink#coord
     *
     * @also
     *  Set coordinates of the feature.
     *
     *  @public
     *  @param {Array.<Array>} coords
     *      coordinates of the feature:[ [longitude, latitude, z], [longitude, latitude, z], , , , ].
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink#coord
     */
}

/**
 *  Feature class of this feature, the value is "NAVLINK".
 *
 *  @public
 *  @expose
 *  @readonly
 *  @name here.xyz.maps.editor.features.Navlink#class
 *  @type string
 */
Navlink.prototype.class = 'NAVLINK';


export default Navlink;
