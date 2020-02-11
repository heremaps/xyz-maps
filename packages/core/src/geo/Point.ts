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

export class Point {
    /**
     *  An interface representing a geographical point.
     *
     *  @class
     *  @public
     *  @expose
     *  @constructor
     *  @param lon {number} longitude
     *  @param lat {number} latitude
     *  @name here.xyz.maps.geo.Point
     */
    constructor(longitude: number, latitude: number) {
        /**
         *  point longitude.
         *
         *  @public
         *  @expose
         *  @type {number}
         *  @name here.xyz.maps.geo.Point#longitude
         */
        this.longitude = longitude;

        /**
         *  point latitude.
         *
         *  @public
         *  @expose
         *  @type {number}
         *  @name here.xyz.maps.geo.Point#latitude
         */
        this.latitude = latitude;
    }

    longitude: number;

    latitude: number;
}
