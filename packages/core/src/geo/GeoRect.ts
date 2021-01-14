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

/**
 *  A GeoRect represents a rectangular geographical area.
 *  The area is defined by two longitudes (west, east) and two latitudes (north, south).
 */
export class GeoRect {
    /**
     *  minimum longitude, the west-most longitude in degrees of the rectangular area
     */
    minLon: number;
    /**
     *  minimum latitude, the south-most latitude in degrees of the rectangular area
     */
    minLat: number;
    /**
     *  maximum longitude, the east-most longitude in degrees of the rectangular area
     */
    maxLon: number;
    /**
     *  maximum latitude, the north-most latitude in degrees of the rectangular area
     */
    maxLat: number;

    /**
     *  @param minLon - minimum longitude (west)
     *  @param minLat - minimum latitude (south)
     *  @param maxLon - maximum longitude (east)
     *  @param maxLat - maximum latitude (north)
     */
    constructor(minLon: number, minLat: number, maxLon: number, maxLat: number) {
        this.minLon = minLon;
        this.minLat = minLat;
        this.maxLon = maxLon;
        this.maxLat = maxLat;
    }
}
