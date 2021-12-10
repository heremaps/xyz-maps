/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
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

import {JSUtils} from '@here/xyz-maps-common';
import {FeatureProvider} from '../providers/FeatureProvider';
import {GeoJSONFeature, GeoJSONBBox} from './GeoJSON';

/**
 * represents a Feature in GeoJSON Feature format.
 */
export class Feature implements GeoJSONFeature {
    /**
     * id of the feature.
     */
    id: string | number;

    /**
     * The properties associated with the feature.
     */
    properties: { [name: string]: any; } | null;

    /*
     * The type of the feature is a string with 'Feature' as its value.
     */
    type: 'Feature' | string;

    /**
     * A geometry is a object where the type member's value is one of: "Point", "MultiPoint", "LineString", "MultiLineString", "Polygon" or "MultiPolygon".
     * A geometry object must have a member with the name "coordinates".
     * The value of the coordinates member is always an array (referred to as the coordinates array below).
     * The structure for the elements in this array are determined by the type of geometry.
     *
     * For type "Point", each element in the coordinates array is a number representing the point coordinate in one dimension.
     *     There must be at least two elements, and may be more.
     *     The order of elements must follow x, y, z order (or longitude, latitude, altitude for coordinates in a geographic coordinate reference system).
     *
     * For type "MultiPoint", each element in the coordinates array is a coordinates array as described for type "Point".
     *
     * For type "LineString", each element in the coordinates array is a coordinates array as described for type "Point".
     *     The coordinates array for a LineString must have two or more elements.
     *     A LinearRing is a special case of type LineString where the first and last elements in the coordinates array are equivalent (they represent equivalent points).
     *     Though a LinearRing is not explicitly represented as a geometry type, it is referred to in the Polygon geometry type definition.
     *
     * For type "MultiLineString", each element in the coordinates array is a coordinates array as described for type "LineString".
     *
     * For type "Polygon", each element in the coordinates array is a coordinates array as described for type "LineString".
     *     Furthermore, each LineString in the coordinates array must be a LinearRing.
     *     For Polygons with multiple LinearRings, the first must be the exterior ring and any others must be interior rings or holes.
     *
     * For type "MultiPolygon", each element in the coordinates array is a coordinates array as described for type "Polygon".
     *
     *
     * ```
     * Point:
     * {
     *    "type": "Point",
     *    "coordinates": [100.0, 0.0]
     * }
     *
     * Polygon:
     * {
     *    "type": "Polygon",
     *    "coordinates": [
     *        [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0] ]
     *    ]
     * }
     *```
     */
    geometry: {
        type: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon' | string,
        coordinates: any[]
        /**
         * cached polygon centroid
         * @internal
         * @hidden
         */
        _c?: number[];
    };

    /**
     * Bounding box of the feature.
     * The value of the bbox member is an array of length 4, with all axes of the most southwesterly point followed by all axes of the more northeasterly point.
     * The "bbox" values define shapes with edges that follow lines of constant longitude and latitude.
     */
    bbox?: [number, number, number, number];

    protected _provider: FeatureProvider;
    // need for quick data merge across multiple tile searches
    private _m: number = 0;

    constructor(feature: GeoJSONFeature, prov?: FeatureProvider) {
        this.id = feature.id;

        this.properties = feature.properties;

        this.geometry = feature.geometry;

        this.bbox = feature.bbox;

        this._provider = prov;
    }

    /**
     * Get the Feature as a JSON Object.
     */
    toJSON(): GeoJSONFeature {
        return JSUtils.clone({
            id: this.id,
            type: this.type,
            bbox: this.bbox,
            properties: this.properties,
            geometry: {
                type: this.geometry.type,
                coordinates: this.geometry.coordinates
            }
        });
    };

    /**
     * Get The FeatureProvider where the Feature is stored in.
     */
    getProvider(): FeatureProvider {
        return this._provider;
    };

    getBBox(): GeoJSONBBox {
        return this._provider.decBBox(this);
    };
}

Feature.prototype.type = 'Feature';
