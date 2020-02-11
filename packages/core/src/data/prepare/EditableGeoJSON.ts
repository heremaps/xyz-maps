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

import {updateBBox as updateFeatureBBox} from './GeoJSON';

import {JSUtils} from '@here/xyz-maps-common';

let UNDEF;

type Coordinate = [number, number, number?];
type BoundingBox = [number, number, number, number];

const prepareFeature = (feature) => {
    if (!feature.properties) {
        feature.properties = {};
    }
    // props['editStates']  = props['editStates']       || new EditStates();

    // (feature.properties || (feature.properties = {})).editStates  = new EditStates();

    // return GeoJSONProvider.prototype.prepare.prepareFeature.call( this, feature );
    if (feature['id'] == UNDEF) {
        feature['id'] = JSUtils.String.random();
    }
    // // calculates object bbox's
    // if (!feature.bbox) {
    //     debugger;
    //     // false -> unkown feature -> no success
    //     return updateFeatureBBox(feature) && feature;
    // } else if (feature.bbox.length === 6) { // convert to 2D bbox
    //     feature.bbox = [feature.bbox[0], feature.bbox[1], feature.bbox[3], feature.bbox[4]];
    // }
    // not supported for now..
    return feature;
};

const calcBBox = (coords: Coordinate[]): BoundingBox => {
    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    const len = coords.length;
    let lon;
    let lat;

    for (let i = 0; i < len; i++) {
        if ((lon = coords[i][0]) < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;

        if ((lat = coords[i][1]) < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }

    // return [ minLon, maxLon, minLat, maxLat ];
    return [minLon, minLat, maxLon, maxLat];
};

const updateBBox = function(feature) {
    const geoType = feature.geometry.type;
    const coordinates = feature.geometry.coordinates;
    const provider = this;

    if (geoType == 'Point') {
        // add routingpoint to bbox to make sure point bbox and navlink bbox are intersecting.
        if (feature.class && feature.class != 'MARKER') {
            const routingPointPosition = feature.properties && provider.readRoutingPosition(feature);

            if (routingPointPosition) {
                feature.bbox = calcBBox([
                    coordinates,
                    provider.encCoord(geoType, routingPointPosition)
                ]);
                return true;
            }
        }
    }

    if (!feature.bbox) {
        return updateFeatureBBox(feature);
    }

    return true;
};

export {prepareFeature, updateBBox};
