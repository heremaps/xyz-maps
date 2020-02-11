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

import {Feature} from '../../features/Feature';

let UNDEF;

type Point = [number, number, number?];
type BBox = [number, number, number, number];
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


function updateBBox(feature: Feature): boolean {
    const geoType = feature.geometry.type;
    let updated = true;
    let bbox;

    if (feature.bbox) return updated;

    const coordinates = feature.geometry.coordinates;

    if (geoType == 'Point') {
        feature.bbox = [coordinates[0], coordinates[1], coordinates[0], coordinates[1]];
    } else {
        bbox = feature.bbox = [Infinity, Infinity, -Infinity, -Infinity];

        if (geoType == 'MultiLineString') {
            for (let ls = 0; ls < coordinates.length; ls++) {
                updateLineStringBBox(coordinates[ls], bbox);
            }
        } else if (geoType == 'MultiPolygon') {
            for (let p = 0; p < coordinates.length; p++) {
                updateLineStringBBox(coordinates[p][0], bbox);
            }
        } else if (geoType == 'LineString' || geoType == 'MultiPoint') {
            updateLineStringBBox(coordinates, bbox);
        } else if (geoType == 'Polygon') {
            updateLineStringBBox(coordinates[0], bbox);
        } else {
            updated = false;
        }
    }

    return updated;
};

const prepareFeature = (feature: Feature): Feature | false => {
    // var geoType = feature.geometry.type;

    if (feature['id'] != UNDEF) {
        feature['id'] = feature['id'];
    } else {
        feature['id'] = Math.random() * 1e8 ^ 0;
    }

    // feature.id =  feature['id'] || feature.properties['mid'] || feature.properties['carto_id'] || Math.random()*1e8^0;
    // feature.coordinates = feature.geometry.coordinates;

    // calculates object bbox's
    if (!feature.bbox) {
        // false -> unkown feature -> no success
        return updateBBox(feature) && feature;
    } else if (feature.bbox.length === 6) { // convert to 2D bbox
        feature.bbox = [feature.bbox[0], feature.bbox[1], feature.bbox[3], feature.bbox[4]];
    }
    // not supported for now..
    return feature;
    // return geoType !== 'MultiPolygon' && feature;
};

export {updateBBox, prepareFeature};
