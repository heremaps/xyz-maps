/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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

import CrossingTester from '../../tools/CrossingTester';
import {Crossing} from '../../API/MCrossing';
import {TrEditor, TurnRestrictionEditor} from '../../tools/turnrestriction/TrEditor';
import DirectionHint from '../../tools/DirectionHint';
import oTools from './NavlinkTools';
import {Feature} from '../feature/Feature';
import {JSUtils} from '@here/xyz-maps-common';
import {GeoJSONCoordinate, GeoPoint, PixelPoint, Style} from '@here/xyz-maps-core';
import lineTools from '../line/LineTools';


let UNDEF;

const throwError = (msg) => {
    throw new Error(msg);
};

const defaultBehavior = {
    snapCoordinates: true
};


/**
 * The Navlink Feature is a generic editable Feature with "LineString" geometry.
 * In addition to the Line Feature, the Navlink feature can be linked/associated with other Navlink Features.
 * A Navlink Feature also can be referenced by Addresses and Places.
 * A Navlink is part of a "road nertwork".
 *
 * The Feature can be edited with the {@link Editor}.
 */
export class Navlink extends Feature {
    /**
     * The feature class of an Navlink Feature is "NAVLINK".
     */
    readonly class: 'NAVLINK';

    /**
     * private data storage for internal api
     * @hidden
     * @internal
     */
    __: { b: { [behavior: string]: boolean } };

    // constructor(feature) {
    //     BasicFeature.apply(this, arguments);
    // }

    /**
     * Get the geographical coordinate(s) of the Navlink feature.
     */
    coord(): [number, number, number?][];
    /**
     * Set the geographical coordinate(s) of the Navlink feature.
     *
     * @param coordinates - the geographical coordinates that should be set.
     */
    coord(coordinates: [number, number, number?][]);

    coord(coordinates?: [number, number, number?][]): [number, number, number?][] {
        return super.coord(coordinates);
    }

    /**
     * Checks for possible crossing geometry with other Navlink features.
     *
     * @param option - options to configure the crossing check.
     *
     * @returns array of found crossings
     *
     * @example
     * ```typescript
     * crossing.checkCrossings({
     *    type: "CROSSING",
     *        styles: {
     *            connector1: {fill: 'black'},
     *            connector2: {stroke: '#FBF'}
     *        }
     * })
     * ```
     */
    checkCrossings(option?: {
        /**
         * Class of the crossing to check for. If no class is defined 'CROSSING' and 'CROSSING_CANDIDATE' is checked for.
         */
        class?: 'CROSSING' | 'CROSSING_CANDIDATE',
        /**
         * Style of the crossings they should be displayed with. 6 configurable styling objects('connector1', 'connector2', 'connector3', 'search1', 'search2', 'found') comprise a crossing.
         */
        styles?: {
            connector1?: Style
            connector2?: Style,
            connector3?: Style,
            search1?: Style,
            search2?: Style,
            found?: Style
        }
    }): Crossing[] {
        const obj = this;
        const prv = oTools.private(obj);
        const xTester = prv.xt || new CrossingTester(obj._e(), obj);

        prv.xt = xTester;

        return xTester.getCrossings(option);
    };


    /**
     * Show or hide the direction hint on the Navlink feature.
     * If the function is called without arguments, the hint will be hidden.
     *
     * @param dir - direction of the Navlink, possible value: "BOTH"|"START_TO_END"|"END_TO_START"
     * @param hideShapes - indicates if the Start and End shapepoints of the Navlink should be displayed or not
     */
    showDirectionHint(dir?: 'BOTH' | 'START_TO_END' | 'END_TO_START', hideShapes?: boolean) {
        // support/fallback for deprecated dir
        dir = {
            'B': 'BOTH',
            'F': 'START_TO_END',
            'T': 'END_TO_START',
            'N': 'BLOCKED'
        }[dir] || dir;


        const obj = this;
        const prv = oTools.private(obj);
        const dirHint = prv.dh;

        if (dirHint) {
            dirHint.destroy();
        }

        prv.dh = dir && new DirectionHint(this._e().objects.overlay, obj, dir, hideShapes);
    };

    /**
     * Sets the radius of the geofence.
     *
     * @deprecated - geofence not supported
     * @param radius - The geofence radius in pixel.
     *
     */
    setGeoFence = (radius: number) => {
        if (isNaN(radius) || radius < 0) {
            throwError('Geofence radius should be a positive Number');
        }
        this._e()._config['geoFence'] = +radius;
    };

    /**
     * Add a new shape-point / coordinate to the Navlink.
     *
     * @param point - the coordinate of the new shape to add.
     * @param index - the index position in the coordinate array of the LineString where the new shape point should be inserted.
     *
     * @returns index of the shape or false if shape could not be added
     */
    addShape(point: GeoPoint | PixelPoint, index?: number) {
        let added: number | boolean = false;
        const link = this;
        const coordinate = this._e().map.getGeoCoord(point);

        if (!coordinate) {
            throwError('Invalid coordinate');
        } else if ((added = oTools.addShp(link, coordinate, index, UNDEF, true)) !== false) {
            oTools.markAsModified(link);
        }
        return added;
    };

    /**
     * Set the behavior options.
     * @experimental
     */
    behavior(options: {
        /**
         * Snap coordinates to {@link Navlink} geometry nearby.
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
         * Snap coordinates to {@link Navlink} geometry nearby.
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
     * Get connected Navlink Features for the node.
     * A node is either the Start or End coordinate of the Navlink (LineString) geometry.
     *
     * @param index - coordinate index for shape/node. 0 -\> "start node", or index of last coordinate for the "end node".
     *
     * @returns Array that's containing the connected Navlink Features.
     */
    getConnectedLinks(index: number): Navlink[];
    /**
     * Get connected Navlink Features for the node.
     * A node is either the Start or End coordinate of the Navlink (LineString) geometry.
     *
     * @param index - coordinate index for shape/node. 0 -\> "start node", or index of last coordinate for the "end node".
     * @param details - flag to enable detailed information of the connected Navlinks.
     *
     * @returns Array of detailed connected Navlink information including the shape/node index of connected link.
     */
    getConnectedLinks(index: number, details: true): { link: Navlink, index: number }[];

    getConnectedLinks(index: number, details: boolean = false) {
        const line = this;
        const EDITOR = line._e();
        const path = line.coord();
        const c2 = path[index];
        const cLinks = [];
        let elPath;
        let lastIndex;
        const isNode = index == 0 || index == path.length - 1;

        const ignoreZ = oTools.ignoreZ(line);

        if (isNode /* &&!line.editState('removed')*/) {
            for (let feature of EDITOR.objects.getInBBox(line.bbox, line.getProvider())) {
                if (feature.id != line.id && feature.class == 'NAVLINK') {
                    elPath = feature.coord();
                    lastIndex = elPath.length - 1;

                    index = oTools.isIntersection(EDITOR, elPath[0], c2, ignoreZ)
                        ? 0
                        : oTools.isIntersection(EDITOR, elPath[lastIndex], c2, ignoreZ)
                            ? lastIndex
                            : null;

                    if (index != null /* && zLevels[shpIndex] == curEl.getZLevels()[index]*/) {
                        cLinks.push(details ? {
                            index: index,
                            link: feature
                        } : feature);
                    }
                }
            }
        }
        return cLinks;
    };

    /**
     * Get the z-levels for the coordinates of the Navlink feature.
     *
     * @returns The Array of z-levels for the coordinates of the Navlink.
     *
     */
    getZLevels(): number[];

    /**
     * Get the z-level for a specific coordinate of the Navlink feature.
     *
     * The z-level of the coordinate at the index of the feature's coordinate array.
     *
     */
    getZLevels(index: number): number;

    getZLevels(index?: number): number[] | number {
        let zLevels = this.getProvider().readZLevels(this);
        return typeof index == 'number' ? zLevels[index] : zLevels.slice(0);
    };

    /**
     * Returns an array of Boolean values indicating whether the corresponding shape is selected at coordinate-index or not.
     */
    getSelectedShapes(): boolean[] | boolean[][] {
        const line = this;
        const selectedShapes = oTools.private(line, 'selectedShapes');
        const coordinates = <GeoJSONCoordinate[]>line.geometry.coordinates;
        const selected = [];
        for (let i = 0; i < coordinates.length; i++) {
            selected[i] = !!(selectedShapes[i]);
        }

        return selected;
    }

    /**
     * Sets the selected state of the shapes at their respective coordinate-indices.
     *
     * @param selectedShapeIndicies Array of Boolean values indicating whether the corresponding shape is selected at index or not
     */
    setSelectedShapes(selectedShapeIndicies: boolean[] | boolean[][]) {
        const line = this;
        const selectedShapes = oTools.private(line, 'selectedShapes');
        const coordinates = <GeoJSONCoordinate[]>line.geometry.coordinates;

        for (let i = 0; i < coordinates.length; i++) {
            selectedShapes[i] = Boolean(selectedShapeIndicies[i]);
        }
        oTools.refreshGeometry(line);
    }

    /**
     * Set the z-levels for the coordinates of the Navlink Feature.
     * For each coordinate of the Navlink, the respective z-level must be provided.
     *
     * @param zLevels - The z-levels to be set for the coordinates of the Navlink.
     *
     * @example
     * ```
     * // modify the zLevel of the second coordinate.
     * let zlevels = navlink.getZLevels();
     * zlevels[1] = -4;
     * navlink.setZLevels(zlevels);
     * ```
     */
    setZLevels(zLevels: number[]) {
        const link = this;
        const _zLevels = link.getZLevels();
        const history = link._e().objects.history;
        const len = link.geometry.coordinates.length;

        if (!(zLevels instanceof Array)) {
            throwError('Invalid \'zlevel\' argument given, no array');
        }

        if (zLevels.length !== len) {
            throwError('Given \'zlevel\' argument is of an invalid size, a length of ' + len + ' is required!');
        }

        history.origin(link);
        // const coords = this.geometry.coordinates;
        let updated = false;

        for (let l = 0, z; l < zLevels.length; l++) {
            z = zLevels[l] ^ 0;
            if (z != _zLevels[l]) {
                zLevels[l] = z;
                updated = true;
            }
        }

        if (updated) {
            history.batch(() => {
                link.getProvider().writeZLevels(link, zLevels);
            });
            // update zlevel visuals
            oTools.refreshGeometry(this);
            oTools.markAsModified(this);
        }
    };

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

    /**
     * Displays and allows editing of the "turn restrictions" for the node/shape-point at the "index" of the Navlink feature.
     * The index must be the respective index in the coordinates array of the first (0) or last coordinate of the Navlink.
     *
     * @param index - the index of the node to display the turn restrictions for.
     *
     * @returns the TurnRestrictionEditor for the respective shape/node.
     */
    editTurnRestrictions(index: number): TurnRestrictionEditor;
    /**
     * Displays and allows editing of all "turn restrictions" for the start and end node of the Navlink feature.
     *
     * @returns Array containing the TurnRestrictionEditor for the start-node and end-node (shape-points).
     */
    editTurnRestrictions(): TurnRestrictionEditor[];

    editTurnRestrictions(index?: number): TurnRestrictionEditor | TurnRestrictionEditor[] {
        const link = this;
        const p = link.coord();
        const EDITOR = link._e();
        const idxs = (index == 0 || index == p.length - 1)
            ? [index]
            : index === UNDEF
                ? [0, p.length - 1]
                : [];

        EDITOR.listeners.trigger('_clearOverlay');

        const trEditors = idxs.map((i) => new TrEditor(link, i));

        return index === UNDEF ? trEditors : trEditors[0];
    };

    prop(): { [name: string]: any };
    prop(property: string): any;
    prop(property: string, value: any): void;
    prop(properties: { [name: string]: any }): void;
    prop(name?, value?): { [name: string]: any } | void {
        const feature = this;
        const EDITOR = feature._e();
        let isModified = false;
        const aLen = arguments.length;
        const properties = feature.getProvider().getFeatureProperties(feature);

        // act as getter
        if (aLen == 0 || aLen == 1 && typeof name == 'string') {
            let props = name ? properties[<string>name] : properties;
            // props = props && properties[props] || properties;

            return typeof props == 'object'
                ? JSUtils.extend(true, new props.constructor(), props)
                : props;
        }

        let props = <{}>name;

        if (aLen == 2) {
            const p = {};
            p[<string>name] = arguments[1];
            props = p;
        }

        for (const key in props) {
            const value = props[key];
            const isObj = typeof value == 'object';
            const curValue = properties[key];

            if (
                isObj && JSON.stringify(value) != JSON.stringify(curValue) ||
                !isObj && curValue !== value
            ) {
                if (!isModified) {// first modify
                    EDITOR.objects.history.origin(feature);
                    isModified = true;
                }

                properties[key] = value;
            }
        }

        if (isModified) {
            EDITOR.setStyle(feature);

            // in case of direction might have changed -> we update the direction
            if (feature.editState('selected')) {
                oTools.showDirection(feature);
            }

            oTools.markAsModified(feature);
        }
    };
}

(<any>Navlink).prototype.class = 'NAVLINK';
