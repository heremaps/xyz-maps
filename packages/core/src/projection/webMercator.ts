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

const PI = Math.PI;

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
    return 360 / PI * Math.atan(Math.exp(y2 * PI / 180)) - 90;
};

const geoToPixel = (lon: number, lat: number, mapSize: number) => {
    return {
        x: lon2x(lon, mapSize),
        y: lat2y(lat, mapSize)
    };
};

const pixelToGeo = (x: number, y: number, mapSize: number) => {
    return {
        longitude: x2lon(x, mapSize),
        latitude: y2lat(y, mapSize)
    };
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
    getGroundResolution
};
