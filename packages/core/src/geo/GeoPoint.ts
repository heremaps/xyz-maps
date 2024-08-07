/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
 *  A GeoPoint represents a geographical point.
 */
export class GeoPoint {
    /**
     *  the longitude in degrees
     */
    longitude: number;
    /**
     *  the latitude in degrees
     */
    latitude: number;
    /**
     *  the altitude in meters
     */
    altitude?: number;

    /**
     *  @param longitude - the longitude in degrees
     *  @param latitude - the latitude in degrees
     *  @param altitude - the altitude in degrees
     */
    constructor(longitude: number, latitude: number, altitude?: number) {
        this.longitude = longitude;

        this.latitude = latitude;

        if (altitude) {
            this.altitude = altitude;
        }
    }
}

