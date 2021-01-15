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

export type GeoJSONGeometryType =
    'Point'
    | 'MultiPoint'
    | 'LineString'
    | 'MultiLineString'
    | 'Polygon'
    | 'MultiPolygon';

export type GeoJSONBBox = [number, number, number, number];

/**
 * A GeoJSON Geometry coordinate is a array of coordinates.
 * The array must contain two or three elements [longitude, latitude, altitude?] / [x, y, z?].
 */
export type GeoJSONCoordinate = [number, number] | [number, number, number];

/**
 * A GeoJSON Feature object.
 */
export interface GeoJSONFeature {
    /**
     *  id of the feature.
     */
    id?: string | number;

    /**
     * Type of a GeoJSONFeature is 'Feature'
     */
    type?: 'Feature';

    /*
     * The bounding box includes information on the coordinate range of the Features.
     * The values of a bbox array are "[west: number, south: number, east: number, north: number]"
     */
    bbox?: GeoJSONBBox;

    /**
     *  The properties associated with the feature.
     */
    properties: { [name: string]: any; } | null;

    /**
     *  A geometry is a object where the type member's value is one of: "Point", "MultiPoint", "LineString", "MultiLineString", "Polygon" or "MultiPolygon".
     *  A geometry object must have a member with the name "coordinates".
     *  The value of the coordinates member is always an array (referred to as the coordinates array below).
     *  The structure for the elements in this array are determined by the type of geometry.
     *
     *  For type "Point", each element in the coordinates array is a number representing the point coordinate in one dimension.
     *      There must be at least two elements, and may be more.
     *      The order of elements must follow x, y, z order (or longitude, latitude, altitude for coordinates in a geographic coordinate reference system).
     *
     *  For type "MultiPoint", each element in the coordinates array is a coordinates array as described for type "Point".
     *
     *  For type "LineString", each element in the coordinates array is a coordinates array as described for type "Point".
     *      The coordinates array for a LineString must have two or more elements.
     *      A LinearRing is a special case of type LineString where the first and last elements in the coordinates array are equivalent (they represent equivalent points).
     *      Though a LinearRing is not explicitly represented as a geometry type, it is referred to in the Polygon geometry type definition.
     *
     *  For type "MultiLineString", each element in the coordinates array is a coordinates array as described for type "LineString".
     *
     *  For type "Polygon", each element in the coordinates array is a coordinates array as described for type "LineString".
     *      Furthermore, each LineString in the coordinates array must be a LinearRing.
     *      For Polygons with multiple LinearRings, the first must be the exterior ring and any others must be interior rings or holes.
     *
     *  For type "MultiPolygon", each element in the coordinates array is a coordinates array as described for type "Polygon".
     *
     *
     * ```
     * Point:
     * {
     *     "type": "Point",
     *     "coordinates": [100.0, 0.0]
     * }
     *
     * Polygon:
     * {
     *     "type": "Polygon",
     *     "coordinates": [
     *         [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0] ]
     *     ]
     * }
     *```
     */
    geometry: {
        type: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon',
        coordinates: GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][] | GeoJSONCoordinate[][][]
    };
}

export interface GeoJSONFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJSONFeature[]
}
