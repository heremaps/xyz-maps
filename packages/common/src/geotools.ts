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

const TORAD = Math.PI / 180;
const TODEG = 180 / Math.PI;
const earthRadius = 6371000; // meters

export type Point = [number, number, number?];
type BBox = [number, number, number, number];

export const calcBearing = (c1: Point, c2: Point) => {
    let r;
    let l1;
    let l2;
    let l3;
    let l4;
    let dr;
    r = Math.PI / 180;
    l1 = c1[1] * r;
    l2 = c2[1] * r;
    l3 = c1[0] * r;
    l4 = c2[0] * r;
    dr = Math.atan2(
        Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(l4 - l3),
        Math.sin(l4 - l3) * Math.cos(l2)
    );
    return (dr / r + 360) % 360;
};

// based on www.movable-type.co.uk/scripts/latlong.html
export const movePoint = (position: Point, distance: number, bearing: number, radius?: number) : Point => {
    radius = (radius === undefined) ? earthRadius : radius;
    // see http://williams.best.vwh.net/avform.htm#LL
    const d = distance / radius; // angular distance in radians
    const b = bearing * TORAD;
    const lat = position[1] * TORAD;
    const lon = position[0] * TORAD;
    const lat2 = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(b));
    let lon2 = lon + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(lat2));
    lon2 = (lon2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI; // normalise to -180..+180°
    return [lon2 * TODEG, lat2 * TODEG];
};

export const getPointBBox = (pnt: Point, distanceMeter: number) => {
    const latitude = pnt[1];
    const longitude = pnt[0];
    const longitudeD = (Math.asin(distanceMeter / (earthRadius * Math.cos(Math.PI * latitude / 180)))) * TODEG;
    const latitudeD = (Math.asin(distanceMeter / earthRadius)) * TODEG;
    return [
        longitude - longitudeD,
        latitude - latitudeD,
        longitude + longitudeD,
        latitude + latitudeD
    ];
};

export const mergeBBoxes = (bbox1: BBox, bbox2: BBox) => {
    if (bbox1[0] > bbox2[0]) {
        bbox1[0] = bbox2[0];
    }
    if (bbox1[1] > bbox2[1]) {
        bbox1[1] = bbox2[1];
    }
    if (bbox1[2] < bbox2[2]) {
        bbox1[2] = bbox2[2];
    }
    if (bbox1[3] < bbox2[3]) {
        bbox1[3] = bbox2[3];
    }
    return bbox1;
};

export const extendBBox = (bbox: BBox, distanceMeter: number) => {
    const leftLonD = Math.abs(Math.asin(distanceMeter / (earthRadius * Math.cos(bbox[0] * TORAD)))) * TODEG;
    const rightLonD = Math.abs(Math.asin(distanceMeter / (earthRadius * Math.cos(bbox[2] * TORAD)))) * TODEG;
    const latitudeD = Math.abs(Math.asin(distanceMeter / earthRadius)) * TODEG;
    return [
        bbox[0] - leftLonD,
        bbox[1] - latitudeD,
        bbox[2] + rightLonD,
        bbox[3] + latitudeD
    ];
};

export const distance = (p1: Point, p2: Point) => {
    const dLat = TORAD * (p2[1] - p1[1]);
    const dLng = TORAD * (p2[0] - p1[0]);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(TORAD * p1[1]) * Math.cos(TORAD * p2[1]) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = earthRadius * c;
    return dist;
};
