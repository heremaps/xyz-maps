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

import {Feature} from '../feature/Feature';
import tools from './LineTools';
import {GeoJSONCoordinate, GeoPoint, PixelPoint, webMercator} from '@here/xyz-maps-core';
import {simplifyPath} from '../../geometry';
import lineTools from './LineTools';

const throwError = (msg) => {
    throw new Error(msg);
};

/**
 * The Line Feature is a generic editable Feature with "LineString" or "MultiLineString" geometry.
 * The Feature can be edited with the {@link Editor}.
 */
class Line extends Feature {
    /**
     *  The feature class of a Line Feature is "LINE".
     */
    readonly class: 'LINE';


    /**
     * Add a new shape point / coordinate to the line.
     *
     * @param point - the coordinate to add
     *
     * @returns index of the shape or false if shape could not be added
     */
    addShape(point: PixelPoint | GeoPoint): boolean | number;

    /**
     * Adds a new coordinate to the line feature with "LineString" or "MultiLineString" geometry.
     * For Line features with "LineString" geometry the a value of 0 must be passed for lineStringIndex.
     *
     * @param point - the coordinate to add
     * @param lineStringIndex - the index of the coordinate array in the MultiLineStrings array of LineString coordinate arrays.
     * @param coordinateIndex - the index position in the LineString coordinate array where the new shape point should be inserted.
     *
     * @returns index of the shape or false if shape could not be added
     */
    addShape(point: PixelPoint | GeoPoint, lineStringIndex: number, coordinateIndex?: number): boolean | number;

    addShape(point: PixelPoint | GeoPoint, lineStringIndex?: number, coordinateIndex?: number): boolean | number {
        const line = this;
        const coordinate = line._e().map.getGeoCoord(point);
        let index: number | false = coordinateIndex;
        if (!coordinate) {
            throwError('Invalid coordinate');
            return false;
        } else if (index = tools.addCoord(line, coordinate, index, lineStringIndex || 0)) {
            tools.displayShapes(line);
            tools.markAsModified(line);
        }
        return index;
    }

    /**
     * Get the geographical coordinate(s) of the Line feature.
     */
    coord(): [number, number, number?][] | [number, number, number?][][];
    /**
     * Set the geographical coordinate(s) of the Line feature.
     *
     * @param coordinates - the geographical coordinates that should be set.
     */
    coord(coordinates: [number, number, number?][] | [number, number, number?][][]);

    coord(coordinates?: [number, number, number?][] | [number, number, number?][][]):
        [number, number, number?][] | [number, number, number?][][] {
        return super.coord(coordinates);
    }

    /**
     * Returns an array of Boolean values indicating whether the corresponding shape is selected at index or not.
     */
    getSelectedShapes(): boolean[] | boolean[][] {
        const line = this;
        const selectedShapes = tools.private(line, 'selectedShapes');
        const coordinates = tools.getCoordinates(line);
        const selected = [];

        for (let ls = 0; ls < coordinates.length; ls++) {
            selected[ls] = [];
            for (let i = 0; i < coordinates[ls].length; i++) {
                selected[ls][i] = !!(selectedShapes[ls]?.[i]);
            }
        }
        return tools.isMultiLineString(line) ? selected : selected[0];
    }

    /**
     * Sets the selected state of the shapes at their respective indices.
     *
     * @param selectedShapeIndicies Array of Boolean values indicating whether the corresponding shape is selected at index or not
     */
    setSelectedShapes(selectedShapeIndicies: boolean[] | boolean[][]) {
        const line = this;
        const selectedShapes = tools.private(line, 'selectedShapes');
        const coordinates = tools.getCoordinates(line);

        if (!Array.isArray(selectedShapeIndicies?.[0])) {
            selectedShapeIndicies = [selectedShapeIndicies as boolean[]];
        }

        for (let ls = 0; ls < coordinates.length; ls++) {
            selectedShapes[ls] ||= [];
            for (let i = 0; i < coordinates[ls].length; i++) {
                selectedShapes[ls][i] = Boolean(selectedShapeIndicies?.[ls]?.[i]);
            }
        }
        tools.displayShapes(line);
    }

    /**
     * Simplifies the line geometry by removing unnecessary points while preserving the overall shape.
     *
     * This method reduces the number of vertices in the line based on a distance-based tolerance.
     * The tolerance can be provided either as a **number** (assumed to be in meters) or as a **string** with units like "px" (pixels) or "m" (meters).
     *
     * @param tolerance - The maximum allowed deviation between the original line and the simplified version.
     *                    This can be specified as:
     *                    - **A number (default in meters)**: The tolerance in meters (e.g., `5` means 5 meters).
     *                    - **A string with units**: e.g., `"10px"` for pixels or `"10m"` for meters.
     *                    - If a string is provided without units, **meters** is assumed by default.
     *
     *                    A larger value results in fewer points and more aggressive simplification.
     *                    A smaller value retains more detail but reduces the simplification effect.
     *
     * @example
     * line.simplifyGeometry(5); // Simplifies the line allowing up to 5 meters of deviation.
     * line.simplifyGeometry("10m"); // Simplifies the line allowing up to 10 meters of deviation.
     * line.simplifyGeometry("10px"); // Simplifies the line with a tolerance of 10 pixels (useful for screen-based coordinates).
     */
    simplifyGeometry(tolerance: number | string) {
        return lineTools.simplifyGeometry(this, tolerance);
    }
}

(<any>Line).prototype.class = 'LINE';

export {Line};
