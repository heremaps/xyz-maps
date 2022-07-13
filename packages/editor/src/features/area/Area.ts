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

import oTools from './PolygonTools';
import {Feature} from '../feature/Feature';
import {GeoJSONCoordinate, GeoPoint, PixelPoint} from '@here/xyz-maps-core';

const MIN_HOLE_SIZE = 8;

const throwError = (msg) => {
    throw new Error(msg);
};

const defaultBehavior = {
    snapCoordinates: true
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
     * private data storage for internal api
     * @hidden
     * @internal
     */
    __: { b: { [behavior: string]: boolean } }

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

    /**
     * Add a rectangular hole to the polygon geometry at the provided position.
     * The position must be located in the exterior of the polygon.
     * The size of the hole is calculated with respect to the polygon geometry.
     *
     * @param point - the center of the rectangular hole to be created
     *
     * @returns boolean that indicates if the hole has been added successfully.
     */
    addHole(point: GeoPoint | PixelPoint | GeoJSONCoordinate): boolean {
        if (point) {
            point = this._e().map.getPixelCoord(point);

            const area = this;
            const polyIdx = oTools.getPoly(area, point);
            const coordinates = oTools.getCoords(area);
            const polygon = coordinates[polyIdx];
            let width = Infinity;

            for (let p = 0; p < polygon.length; p++) {
                const w = oTools.getMaxSpace(area, point, polygon[p]);
                if (w < width) {
                    width = w;
                }
            }

            if (width != Infinity) {
                width = Math.floor(width * .5);

                if (width > MIN_HOLE_SIZE) {
                    const x = point[0];
                    const y = point[1];
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

    /**
     * Set the behavior options.
     * @experimental
     */
    behavior(options: {
        /**
         * Snap coordinates to polygon geometry nearby.
         */
        snapCoordinates?: boolean
    }): void;
    /**
     * Set the value of a specific behavior option.
     * @experimental
     */
    behavior(name: string, value: boolean): void;
    /**
     * Get the value of a specific behavior option.
     * @experimental
     */
    behavior(option: string): any;
    /**
     * Get the behavior options.
     * @experimental
     */
    behavior(): {
        /**
         * Snap coordinates to polygon geometry nearby.
         */
        snapCoordinates: boolean
    };

    behavior(options?: any, value?: boolean) {
        let behavior = oTools.private(this, 'b') || {...defaultBehavior};

        switch (arguments.length) {
        case 0:
            return behavior;
        case 1:
            if (typeof options == 'string') {
                // getter
                return behavior[options];
            } else {
                // setter
                behavior = {...behavior, ...options};
                break;
            }
        case 2:
            behavior[options] = value;
        }

        this.__.b = behavior;
    }

    /**
     *  Get the geographical coordinate(s) of the Area feature.
     */
    coord(): [number, number, number?][][] | [number, number, number?][][][];
    /**
     *  Set the geographical coordinate(s) of the Area feature.
     *
     *  @param coordinates - the geographical coordinates that should be set.
     */
    coord(coordinates: [number, number, number?][][] | [number, number, number?][][][]);

    coord(coordinates?) {
        return super.coord(coordinates);
    }
}

(<any>Area).prototype.class = 'AREA';

export {Area};
