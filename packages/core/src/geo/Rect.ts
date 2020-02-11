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

export class Rect {
    /**
     *  An interface representing a rectangular geographic area.
     *  The area is defined by four geographical coordinates two (left, right) longitudes and two (top, bottom) latitudes.
     *
     *  @class
     *  @public
     *  @expose
     *  @constructor
     *  @param minLon {number} min longitude
     *  @param minLat {number} min latitude
     *  @param maxLon {number} max longitude
     *  @param maxLat {number} max latitude
     *  @name here.xyz.maps.geo.Rect
     */
    constructor(minLon: number, minLat: number, maxLon: number, maxLat: number) {
        /**
         *  min longitude, the left-most longitude of this rectangular area.
         *
         *  @public
         *  @expose
         *  @type {number}
         *  @name here.xyz.maps.geo.Rect#minLon
         */
        this.minLon = minLon;

        /**
         *  min latitude, the south-most latitude of this rectangular area
         *
         *  @public
         *  @expose
         *  @type {number}
         *  @name here.xyz.maps.geo.Rect#minLat
         */
        this.minLat = minLat;

        /**
         *  max longitude, the right-most longitude of this rectangular area.
         *
         *  @public
         *  @expose
         *  @type {number}
         *
         *  @name here.xyz.maps.geo.Rect#maxLon
         */
        this.maxLon = maxLon;

        /**
         *  max latitude, the north-most latitude of this rectangular area
         *
         *  @public
         *  @expose
         *  @type {number}
         *
         *  @name here.xyz.maps.geo.Rect#maxLat
         */
        this.maxLat = maxLat;
    }

    minLon: number;

    minLat: number;

    maxLon: number;

    maxLat: number;
}
