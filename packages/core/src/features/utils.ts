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

import {Feature} from '../features/Feature';
import {GeoJSONCoordinate, GeoJSONFeature} from '@here/xyz-maps-core';
type Point = number[];
type BBox = number[];
type Coordinates = Array<Point>;


const updatePointBBox = (point: Point, bbox?: BBox) => {
    let lon;
    let lat;

    if (bbox) {
        if ((lon = point[0]) < bbox[0]) {
            bbox[0] = lon;
        }

        if (lon > bbox[2]) {
            bbox[2] = lon;
        }

        if ((lat = point[1]) < bbox[1]) {
            bbox[1] = lat;
        }

        if (lat > bbox[3]) {
            bbox[3] = lat;
        }
    }
};


const updateLineStringBBox = (lineString: Coordinates, bbox?: BBox) => {
    let i = lineString.length;

    while (i--) {
        updatePointBBox(lineString[i], bbox);
    }
};

const calcBBox = (feature: GeoJSONFeature, bbox?: BBox): BBox | false => {
    const geoType = feature.geometry.type;

    if (geoType == 'Point') {
        const coordinates = (feature as GeoJSONFeature<'Point'>).geometry.coordinates;
        if (bbox) {
            updatePointBBox(<[number, number]>coordinates, bbox);
        } else {
            bbox = [coordinates[0], coordinates[1], coordinates[0], coordinates[1]];
        }
    } else {
        bbox = bbox || [Infinity, Infinity, -Infinity, -Infinity];
        const coordinates = feature.geometry.coordinates;

        if (geoType == 'MultiLineString') {
            for (let ls = 0; ls < coordinates.length; ls++) {
                updateLineStringBBox((coordinates as GeoJSONCoordinate[][])[ls], bbox);
            }
        } else if (geoType == 'MultiPolygon') {
            for (let p = 0; p < coordinates.length; p++) {
                updateLineStringBBox(coordinates[p][0], bbox);
            }
        } else if (geoType == 'LineString' || geoType == 'MultiPoint') {
            updateLineStringBBox((coordinates as GeoJSONCoordinate[]), bbox);
        } else if (geoType == 'Polygon') {
            updateLineStringBBox((coordinates as GeoJSONCoordinate[][])[0], bbox);
        } else {
            return false;
        }
    }

    return bbox;
};

export {calcBBox};

export default {calcBBox};
