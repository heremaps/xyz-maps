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

import CrossingTester from '../../tools/CrossingTester';
import {Crossing} from '../../API/MCrossing';
import {TurnRestriction, TurnRestrictions} from './TurnRestriction';
import TurnRestrictionEditor from '../../tools/turnrestriction/Editor';
import DirectionHint from '../../tools/DirectionHint';
import oTools from './NavlinkTools';
import {Feature} from '../feature/Feature';
import {JSUtils} from '@here/xyz-maps-common';
import {GeoPoint, PixelPoint, Style} from '@here/xyz-maps-core';

let UNDEF;

const throwError = (msg) => {
    throw new Error(msg);
};

/** ********************************************************************************************************************/


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
     * @param option.class - Class of crossing (CROSSING|CROSSING_CANDIDATE) to check for
     * @param option.styles - Style of the crossings they should be displayed with. 6 configurable styling objects('connector1', 'connector2', 'connector3', 'search1', 'search2', 'found') comprise a crossing.
     *
     * @returns array of found crossings
     *
     * @example
     * ```
     * crossing.checkCrossings({
     *    type: "CROSSING",
     *        styles: {
     *            connector1: {fill: 'black'},
     *            connector2: {stroke: '#FBF'}
     *        }
     * })
     * ```
     */
    checkCrossings(option: {
        class?: 'CROSSING' | 'CROSSING_CANDIDATE',
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
     * @deprecated
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
        let added = false;
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
     * Get connected Navlink Features for the node.
     * A node is either the Start or End coordinate of the Navlink (LineString) geometry.
     *
     * @param index - coordinate index for shape/node. 0 -> "start node", or index of last coordinate for the "end node".
     *
     * @returns Array that's containing the connected Navlink Features.
     */
    getConnectedLinks(index: number): Navlink[];
    /**
     * Get connected Navlink Features for the node.
     * A node is either the Start or End coordinate of the Navlink (LineString) geometry.
     *
     * @param index - coordinate index for shape/node. 0 -> "start node", or index of last coordinate for the "end node".
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

        if (isNode /* &&!line.editState('removed')*/) {
            for (let feature of EDITOR.objects.getInBBox(line.bbox, line.getProvider())) {
                if (feature.id != line.id && feature.class == 'NAVLINK') {
                    elPath = feature.coord();
                    lastIndex = elPath.length - 1;

                    index = oTools.isIntersection(EDITOR, elPath[0], c2)
                        ? 0
                        : oTools.isIntersection(EDITOR, elPath[lastIndex], c2)
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
     * @param index - the index of the shape to get z-level for the specific shape only
     *
     * @returns The Array of z-levels for the coordinates of the Navlink or the specific z-level at shape index.
     *
     */
    getZLevels(index?: number): number[] | number {
        let zLevels = this.getProvider().readZLevels(this);
        return typeof index == 'number' ? zLevels[index] : zLevels.slice(0);
    };


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
            history.ignore(() => {
                link.getProvider().writeZLevels(link, zLevels);
            });
            // update zlevel visuals
            oTools.refreshGeometry(this);
            oTools.markAsModified(this);
        }
    };

    /**
     * Displays and allows editing of the "turn restrictions" for the node/shape-point at the "index" of the Navlink feature.
     * The index must be the respective index in the coordinates array of the first (0) or last coordinate of the Navlink.
     *
     * @param index - the index of the node to display the turn restrictions for.
     *
     * @returns the TurnRestrictions for the respective shape/node.
     */
    editTurnRestrictions(index: number): TurnRestrictions;
    /**
     * Displays and allows editing of all "turn restrictions" for the start and end node of the Navlink feature.
     *
     * @returns Array containing the TurnRestrictions for the start-node and end-node (shape-points).
     */
    editTurnRestrictions(): TurnRestrictions[];

    editTurnRestrictions(index?: number): TurnRestrictions | TurnRestrictions[] {
        const link = this;
        const p = link.coord();
        const idxs = (index == 0 || index == p.length - 1)
            ? [index]
            : index === UNDEF
                ? [0, p.length - 1]
                : [];
        const publicTR = [];
        const EDITOR = link._e();

        EDITOR.listeners.trigger('_clearOverlay');

        // TODO: Refactor TurnRestriction mess
        for (var i = 0; i < idxs.length; i++) {
            let turnResEditor = new TurnRestrictionEditor(EDITOR);
            turnResEditor.showRestrictions(link, idxs[i]);
            publicTR.push(new TurnRestriction(turnResEditor, link, idxs[i]));
        }

        return index === UNDEF ? publicTR : publicTR[0];
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
