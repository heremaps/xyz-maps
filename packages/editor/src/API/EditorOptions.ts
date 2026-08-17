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

import {JSUtils} from '@here/xyz-maps-common';
import {TileLayer} from '@here/xyz-maps-core';
import {Feature} from '../features/feature/Feature';

/**
 * Edit operation requested by the {@link EditorOptions.editRestrictions} callback.
 */
export enum EditOperation {
    /**
     * Change the feature geometry or one of its coordinates.
     */
    Geometry = 1,
    /**
     * Remove the feature or one of its editable geometry elements.
     */
    Remove = 2
}

/**
 * Additional context for an edit restriction check.
 */
export interface EditRestrictionContext {
    /**
     * Zero-based index of the affected coordinate within its immediate coordinate array.
     */
    readonly coordinateIndex?: number;

    /**
     * Zero-based index of the affected LineString or polygon ring.
     */
    readonly lineStringIndex?: number;

    /**
     * Zero-based index of the affected polygon in a MultiPolygon.
     */
    readonly polygonIndex?: number;
}

/**
 * Options to configure the map editor ({@link editor.Editor}).
 */
interface EditorOptions {
    /**
     * define the TileLayers that should be edited with the {@link editor.Editor}
     */
    layers?: TileLayer[];
    /**
     * Callback that is called before certain edit operations are executed.
     * This callback can be used to allow or restrict specific edit operations based on the return value.
     *
     * @param feature - The map feature to be edited.
     * @param operation - The requested edit operation:
     *     1 - GEOMETRY CHANGE
     *     2 - REMOVE
     * @param context - Optional context of the affected edit target. For coordinate-level
     *     restrictions it can contain `coordinateIndex`, `lineStringIndex`, and
     *     `polygonIndex`. It is `undefined` when no concrete coordinate is affected.
     *
     * @returns {boolean} - Return `false` to allow the operation(s) and execute the edits.
     *                      Return `true` to forbid the operation(s); no edits will be executed.
     *
     * @defaultValue false
     */
    editRestrictions?: (
        feature: Feature,
        operation: EditOperation,
        context?: EditRestrictionContext
    ) => boolean;

    /**
     * Define the pixel radius of the area within a shape point of a Navlink Feature can be moved by mouse/touch interaction.
     *
     * @deprecated geoFence not supported.
     * @defaultValue false - deactivated by default.
     */
    geoFence?: number | false;

    /**
     *
     * The distance in meters between each of two coordinates/shape-points where snapping occurs.
     * Two coordinates/shape-points closer than this parameter will be joined to a single point.
     *
     * @defaultValue 2
     */
    snapTolerance?: number;

    /**
     * The "routingPointPrecision" defines the number of decimal places of the position of a routing point when it is changed.
     *
     * @defaultValue 5
     */
    routingPointPrecision?: number;

    /**
     * The number of decimal places used when feature geometry coordinates are written.
     *
     * @defaultValue 9
     */
    coordinatePrecision?: number;

    /**
     * Defines the coordinate precision for the automatic intersection detection.
     * Number of decimal points of the WGS coordinates that must match.
     *
     * @defaultValue 5
     */
    intersectionScale?: number;

    // /**
    //  * Maximum variance for crossing candidate detection of Navlink Features in meters.
    //  *
    //  * @defaultValue 2
    //  */
    // XTestMaxDistance?: number;


    /**
     * The distance in meters between the two shape-points when two Navlink Features get disconnected.
     *
     * @defaultValue 3
     */
    disconnectShapeDistance?: number;

    /**
     * Enable or disable automatic connection of Navlink shapes to nearby Navlinks on drag-drop.
     * When set to false, shapes will not automatically connect after being dragged, allowing manual connection handling via {@link Navlink.getConnectionCandidates}.
     * Can be overridden per feature using {@link Navlink.behavior}.
     *
     * @defaultValue true
     */
    autoConnect?: boolean;

    /**
     * Keep features selected after mapview-change or click on the "ground" of the map.
     * if set to false -\> will be cleared after viewport change and click on ground.
     * if set to "viewportChange" -\> will only be cleared on ground click.
     * if set to true -\> no clear at all.
     *
     * @defaultValue "viewportChange"
     */
    keepFeatureSelection?: string | boolean;

    /**
     * Select a feature by default on tap/pointerup event.
     *
     * @defaultValue true
     */
    featureSelectionByDefault?: boolean;

    /**
     * The maximum allowed distance of the "Routing Point" to the Address/Place itself in meters.
     *
     * @defaultValue 1000 - 1000 meters
     */
    maxRoutingPointDistance?: number;

    /**
     * Configure Address feature behavior.
     */
    address?: {
        /**
         * Automatically resolve to the nearest Navlink when no valid routing point is available.
         *
         * @defaultValue true
         */
        autoResolveRoutingPoint?: boolean;
    };

    /**
     * Configure Place feature behavior.
     */
    place?: {
        /**
         * Automatically resolve to the nearest Navlink when no valid routing point is available.
         *
         * @defaultValue false
         */
        autoResolveRoutingPoint?: boolean;
    };

    /**
     *
     * Configure "automatic coordinates snapping" to nearby geometries when a shape of a Navlink or Area Feature is dragged.
     * - 'true' : coordinates are snapped during the drag operation. [DEFAULT]
     * - 'false': coordinates are snapped after the drag operation is complete.
     *
     * @defaultValue 'drag'
     *
     * @hidden
     * @internal
     */
    snapOnDrag?: boolean;

    /**
     * Optional service settings.
     */
    services?: {
        /**
         * define reverseGeocoder service/functionality to request the address for a geographical position.
         */
        reverseGeocoder?: {
            /**
             * Get the iso country code for a geographical position.
             * If "getISOCC" is defined, the iso country code will be attached to all newly created features before sending to remote datasource.
             *
             * @example
             * ```typescript
             * {
             *     reverseGeocoder:
             *     {
             *         getISOCC(lon: number, lat: number, callback:(isocc:string)=>void){
             *             // do a reverse geocode request to get the isocc value
             *             const isocc = "theIsoCountryCode";
             *
             *             callback(isocc);
             *         }
             *     }
             * }
             * ```
             */
            getISOCC?(longitude: number, latitude: number, callback: (isoCC: string) => void): string | undefined;
        }
    };
    /**
     * Enable/Disable debug logs
     *
     * @internal
     */
    debug?: boolean;
}


const defaultOptions: EditorOptions = {
    debug: true,
    editRestrictions: function() {
        // NO RESTRICTIONS PER DEFAULT FOR NOW
        return false;
        //    var restrictions = properties['protected'] ? 3 : 0;
        //    return !!(restrictions & checkMask);
    },
    services: {
        reverseGeocoder:
            {
                //  'getISOCC': function(lon, lat, callback){
                //      return 'ISOCC';
                //  }
            }

    },
    geoFence: false,
    snapTolerance: 2, // 2 meter
    intersectionScale: 5,
    routingPointPrecision: 5,
    coordinatePrecision: 9,
    // XTestMaxDistance: 2,
    disconnectShapeDistance: 3,
    autoConnect: true,
    keepFeatureSelection: 'viewportChange',
    featureSelectionByDefault: true,
    maxRoutingPointDistance: 1000,
    address: {
        autoResolveRoutingPoint: true
    },
    place: {
        autoResolveRoutingPoint: false
    },
    snapOnDrag: true
};

const isAutoResolveRoutingPointEnabled = (
    options: EditorOptions,
    featureClass: 'ADDRESS' | 'PLACE'
) => {
    const classOptions = featureClass == 'ADDRESS' ? options && options.address : options && options.place;
    const option = classOptions && classOptions.autoResolveRoutingPoint;

    return option == undefined ? featureClass == 'ADDRESS' : option;
};


const mergeOptions = (options): EditorOptions => {
    const merged = JSUtils.extend(true, {}, defaultOptions);

    for (const c in options) {
        switch (c) {
        case 'services':
            JSUtils.extend(true, merged[c], options[c]);
            break;

        case 'editRestrictions':
            if (typeof options[c] !== 'function') {
                break;
            }

        default:
            merged[c] = options[c];
        }
    }

    return merged;
};


export {defaultOptions, EditorOptions, mergeOptions, isAutoResolveRoutingPointEnabled};
