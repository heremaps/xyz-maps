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
import {PixelPoint} from '../pixel/PixelPoint';
import {GeoPoint} from '../geo/GeoPoint';

const PI = Math.PI;
const TO_RAD = PI / 180;
// 1 times the Polar Radius, and 2 Times the Equatorial radius
const AVG_EARTH_RADIUS_METERS = (6356752 + 2 * 6378137) / 3;
const AVG_EARTH_CIRCUMFERENCE_METERS = 2 * PI * AVG_EARTH_RADIUS_METERS;

// ground resolution measured at the equator (earthCircumferenceMeters: 40075017 meters)
const METER_PER_PIXEL_AT_ZOOM = Array.from({length: 33}, (v, zoom) => 40075017 / 256 / (1 << zoom));

const meterToPixel = (val: number, zoom: number) => val / METER_PER_PIXEL_AT_ZOOM[zoom];

const pixelToMeter = (val: number, zoom: number) => val * METER_PER_PIXEL_AT_ZOOM[zoom];

const getGroundResolution = (zoom: number) => METER_PER_PIXEL_AT_ZOOM[zoom];

const mapSizePixel = (tileSize: number, zoomLevel: number): number => {
    return Math.pow(2, zoomLevel) * tileSize;
};

const lon2x = (lon: number, mapSize: number): number => {
    return (lon + 180) / 360 * mapSize;
};

const lat2y = (lat: number, mapSize: number): number => {
    const y = 180 / PI * Math.log(Math.tan(PI / 4 + lat * PI / 360));
    return (180 - y) * mapSize / 360;
};

const x2lon = (x: number, mapSize: number): number => {
    return x * 360 / mapSize - 180;
};

const y2lat = (y: number, mapSize: number): number => {
    const y2 = 180 - y * 360 / mapSize;
    return 360 / PI * Math.atan(Math.exp(y2 * TO_RAD)) - 90;
};

const geoToPixel = (lon: number, lat: number, mapSize: number): PixelPoint => {
    return new PixelPoint(lon2x(lon, mapSize), lat2y(lat, mapSize));
};

const pixelToGeo = (x: number, y: number, mapSize: number): GeoPoint => {
    return new GeoPoint(x2lon(x, mapSize), y2lat(y, mapSize));
};

const earthCircumference = (lat: number = 0) => {
    return AVG_EARTH_CIRCUMFERENCE_METERS * Math.cos(lat * TO_RAD);
};

const alt2z = (alt: number, lat?: number): number => {
    return alt / earthCircumference(lat);
};

export default {
    mapSizePixel,
    lon2x,
    lat2y,
    x2lon,
    y2lat,
    pixelToGeo,
    geoToPixel,
    meterToPixel,
    pixelToMeter,
    getGroundResolution,
    alt2z,
    earthCircumference
};
