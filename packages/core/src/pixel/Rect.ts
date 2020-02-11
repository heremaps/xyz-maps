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
     *  An interface representing a rectangular area in pixel.
     *
     *  @class
     *  @public
     *  @expose
     *  @constructor
     *  @param minX {number} min x position in pixel
     *  @param minY {number} min y position in pixel
     *  @param maxX {number} max x position in pixel
     *  @param maxY {number} max y position in pixel
     *  @name here.xyz.maps.pixel.Rect
     */
    constructor(minX: number, minY: number, maxX: number, maxY: number) {
        /**
         *  min x, the left-most x position of this rectangular area.
         *
         *  @public
         *  @expose
         *  @type {number}
         *  @name here.xyz.maps.pixel.Rect#minX
         */
        this.minX = minX;

        /**
         *  min y, the south-most y position of this rectangular area
         *
         *  @public
         *  @expose
         *  @type {number}
         *  @name here.xyz.maps.pixel.Rect#minY
         */
        this.minY = minY;

        /**
         *  max x, the right-most x position of this rectangular area.
         *
         *  @public
         *  @expose
         *  @type {number}
         *
         *  @name here.xyz.maps.pixel.Rect#maxX
         */
        this.maxX = maxX;

        /**
         *  max y, the north-most y position of this rectangular area
         *
         *  @public
         *  @expose
         *  @type {number}
         *
         *  @name here.xyz.maps.pixel.Rect#maxY
         */
        this.maxY = maxY;
    }

    minX: number;

    minY: number;

    maxX: number;

    maxY: number;
}
