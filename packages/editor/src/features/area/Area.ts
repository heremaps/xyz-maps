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

import oTools from './PolygonTools';
import {Feature} from '../feature/Feature';
import {GeoPoint, PixelPoint} from '@here/xyz-maps-core';

const MIN_HOLE_SIZE = 8;

const throwError = (msg) => {
    throw new Error(msg);
};


const copyCoord = (c: [number, number, number?]) => {
    return c.length == 3
        ? [c[0], c[1], c[2]]
        : [c[0], c[1]];
};

const copyPolygon = (poly) => {
    const cpy = [];
    for (let l = 0; l < poly.length; l++) {
        const linestring = poly[l];
        const ls = cpy[cpy.length] = [];

        for (let i = 0; i < linestring.length; i++) {
            ls[i] = copyCoord(linestring[i]);
        }
    }
    return cpy;
};

/**
 * The Area Feature is a generic editable Feature with "Polygon" or "MultiPolygon" geometry.
 */
class Area extends Feature {
    /**
     *  The feature class of an Area Feature is "AREA".
     */
    readonly class: 'AREA';

    /**
     *  Get the geographical coordinate(s) of the Area feature.
     */
    coord(): [number, number, number?][][][] | [number, number, number?][][][][];
    /**
     *  Set the geographical coordinate(s) of the Area feature.
     *
     *  @param coordinates - the geographical coordinates that should be set.
     */
    coord(coordinates: [number, number, number?][][][] | [number, number, number?][][][][]);

    coord(coords?) {
        const feature = this;
        const geoType = feature.geometry.type;
        let coordinates;

        if (coords instanceof Array) {
            oTools.deHighlight(feature);

            oTools._setCoords(feature, coords);

            oTools.markAsModified(feature);
        } else {
            coords = feature.getProvider().decCoord(feature);

            if (geoType == 'Polygon') {
                coordinates = copyPolygon(coords);
            } else {
                coordinates = [];
                for (let p = 0; p < coords.length; p++) {
                    coordinates[p] = copyPolygon(coords[p]);
                }
            }
        }
        return coordinates;
    };


    /**
     * Add a new shape point / coordinate to the area.
     *
     * @param point - the coordinate of the new shape to add
     * @param polygonIndex - the index of the polygon where the new shape/coordinate should be inserted.
     * @param index - the index position in the coordinate array of the polygon where the new shape point should be inserted.
     *
     * @returns index of the shape or false if shape could not be added
     */
    addShape(point: GeoPoint | PixelPoint, polygonIndex?: number, index?: number) {
        let added: number | boolean = false;
        const coordinate = this._e().map.getGeoCoord(point);

        if (!point) {
            throwError('Invalid coordinate');
        } else {
            if (arguments.length == 1) {
                polygonIndex = oTools.getPoly(this, coordinate);
            }

            if ((added = oTools.addShp(this, coordinate, polygonIndex ^ 0, 0, index)) !== false) {
                oTools.markAsModified(this);
            }
        }
        return added;
    };


    addHole(position: { x: number, y: number, z?: number } | { longitude: number, latitude: number, z?: number } | [number, number, number?]): boolean {
        if (position) {
            position = this._e().map.getPixelCoord(position);

            const area = this;
            const polyIdx = oTools.getPoly(area, position);
            const coordinates = oTools.getCoords(area);
            const polygon = coordinates[polyIdx];
            let width = Infinity;

            for (let p = 0; p < polygon.length; p++) {
                const w = oTools.getMaxSpace(area, position, polygon[p]);
                if (w < width) {
                    width = w;
                }
            }

            if (width != Infinity) {
                width = Math.floor(width * .5);

                if (width > MIN_HOLE_SIZE) {
                    const x = position[0];
                    const y = position[1];
                    const hole = [

                        [x - width, y + width],
                        [x + width, y + width],
                        [x + width, y - width],
                        [x - width, y - width],
                        [x - width, y + width]

                    ].map((p: [number, number]) => this._e().map.getGeoCoord(p));

                    if (!oTools.isClockwise(polygon[0])) {
                        hole.reverse();
                    }

                    polygon.push(hole);

                    oTools._setCoords(area, coordinates, true);

                    oTools.markAsModified(area);
                    return true;
                }
            }
            return false;
        }
    };
}

(<any>Area).prototype.class = 'AREA';

export {Area};
