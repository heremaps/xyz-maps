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

import BasicFeature from '../feature/Feature';
// import EDITOR from '../../editor';
import tools from './LineTools';

const throwError = (msg) => {
    throw new Error(msg);
};

/**
 *  @class
 *  @expose
 *  @public
 *  @extends here.xyz.maps.editor.features.Feature
 *  @name here.xyz.maps.editor.features.Line
 *
 *  @constructor
 *  @param {(String|Number)=} id of the line
 *  @param {Array.<here.xyz.maps.editor.GeoCoordinate>|Array.<here.xyz.maps.editor.PixelCoordinate>} coordinates
 *      Coordinates of the line.
 *  @param {here.xyz.maps.editor.features.Feature.Properties=} properties
 *      Properties of the line.
 */
class Line extends BasicFeature {
    /**
     *  Add a new shape point to the link.
     *
     *  @public
     *  @expose
     *  @param {here.xyz.maps.editor.PixelCoordinate|here.xyz.maps.editor.GeoCoordinate} coordinate
     *      the coordinate to add
     *  @param {Number=} index
     *      the position where new shape point should be inserted.
     *  @return {boolean|number} isAdded
     *      index of shape or false if could not be added
     *  @function
     *  @name here.xyz.maps.editor.features.Line#addShape
     */
    addShape(coordinate, index) {
        const line = this;
        coordinate = line._e().map.getGeoCoord(coordinate);

        if (!coordinate) {
            throwError('missing pixel coordinate');
            index = false;
        } else if (index = tools.addCoord(line, coordinate, index)) {
            tools.markAsModified(line);
        }
        return index;
    }
}

/**
 *  Feature class of a Line feature is "LINE".
 *
 *  @public
 *  @expose
 *  @readonly
 *  @name here.xyz.maps.editor.features.Line#class
 *  @type string
 */
Line.prototype.class = 'LINE';

export default Line;
