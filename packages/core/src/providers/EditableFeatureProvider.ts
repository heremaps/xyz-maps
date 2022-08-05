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

import {FeatureProvider as FeatureTileProvider} from './FeatureProvider';
import {Feature} from '../features/Feature';
import {JSUtils} from '@here/xyz-maps-common';
import {NavlinkSplitHook, NavlinkDisconnectHook, FeatureRemoveHook, CoordinatesUpdateHook} from '@here/xyz-maps-editor';
import {GeoJSONCoordinate} from '../features/GeoJSON';
import {TileProviderOptions} from './TileProvider/TileProviderOptions';

// type EditorFeature = { editState: (state?: string, value?) => any };

type NavlinkId = string | number;

type Navlink = Feature;

/**
 *  Configuration options of a EditableFeatureProviderOptions.
 */
export interface EditableFeatureProviderOptions extends TileProviderOptions {
    /**
     *  Allow or prevent editing by the {@link editor.Editor | Editor} module.
     *
     *  @defaultValue false
     */
    editable?: boolean;
    /**
     * Enforce random ids for newly created features.
     * If "enforceRandomFeatureId" is set to true, the ids of features created by {@link editor.Editor.addFeature | editor.addFeature} are ignored and randomly created.
     * If "enforceRandomFeatureId" is set to false, ids of features created by {@link editor.Editor.addFeature | editor.addFeature} can be set. Random ids are only generated if none have been set.
     *
     * @defaultValue true
     */
    enforceRandomFeatureId?: boolean;
    /**
     * Add hook functions that will be called during the execution of the corresponding "editing operation".
     * The "hooks" option is a map with the "editing operation" as its key and the corresponding Hook or Array of Hook function(s) as its value.
     *
     * Available editing operations are 'Navlink.disconnect', 'Navlink.split', 'Feature.remove', 'Coordinates.remove'.
     *
     * @see {@link editor.Editor.addHook | editor.addHook}
     */
    hooks?: {
        /**
         * The NavlinkSplitHook(s) will be called whenever a Navlink is devided into two new Navlinks. ('Navlink.split' operation).
         */
        'Navlink.split'?: NavlinkSplitHook | NavlinkSplitHook[],
        /**
         * The NavlinkDisconnectHook(s) will be called whenever a Navlink is disconnected from an intersection ('Navlink.disconnect' operation).
         */
        'Navlink.disconnect'?: NavlinkDisconnectHook | NavlinkDisconnectHook[],
        /**
         * The FeatureRemoveHook(s) will be called when a feature is being removed ('Feature.remove' operation).
         */
        'Feature.remove'?: FeatureRemoveHook | FeatureRemoveHook[],
        /**
         * The CoordinatesUpdateHook(s) will be called whenever the coordinates of a feature are added, updated or removed ('Coordinates.update' operation).
         */
        'Coordinates.update'?: CoordinatesUpdateHook | CoordinatesUpdateHook[]
    };
};

/**
 * EditableFeatureProvider is an abstract FeatureTileProvider that can be edited using the {@link Editor} module.
 */
export abstract class EditableFeatureProvider extends FeatureTileProvider {
    _e: any;

    editable: boolean;
    enforceRandomFeatureId: boolean;
    /**
     * Hook functions that will be called during the execution of the corresponding "editing operation".
     * The "hooks" property is a map with the "editing operation" as its key and the corresponding Hook or Array of Hook function(s) as its value.
     *
     * Available editing operations are 'Navlink.disconnect', 'Navlink.split', 'Feature.remove', 'Coordinates.remove'.
     *
     * @see {@link editor.Editor.addHook | editor.addHook }
     */
    hooks?: {
        'Navlink.split'?: NavlinkSplitHook | NavlinkSplitHook[],
        'Navlink.disconnect'?: NavlinkDisconnectHook | NavlinkDisconnectHook[],
        'Feature.remove'?: FeatureRemoveHook | FeatureRemoveHook[],
        'Coordinates.update'?: CoordinatesUpdateHook | CoordinatesUpdateHook[]
    };

    private blocked = {};

    constructor(options: EditableFeatureProviderOptions) {
        super({editable: true, enforceRandomFeatureId: true, ...options});
    }

    /**
     * This method is used to determine the {@link editor.Feature.class | FeatureClass} required to edit the feature.
     * The {@link editor.Feature.class | FeatureClass} defines how a certain feature behaves when its getting edited.
     *
     * By default, the {@link editor.Editor Editor} handles all features of geometry type 'LineString' as {@link editor.Line | Line}, 'Point' as {@link editor.Marker | Marker} and '(Multi)Polygon' as {@link editor.Area | Area}.
     *
     * If you want to edit features with {@link editor.Feature.class | FeatureClass} 'NAVLINK', 'PLACE' or 'ADDRESS' this method must be overridden to enable editing of {@link editor.Navlink | Navlinks}, {@link editor.Place | Places} or {@link editor.Address | Addresses}.
     *
     * @param feature - The feature whose {@link editor.Feature.class | FeatureClass} is requested
     *
     * @returns the FeatureClass of the feature, or null if the feature should not be editable.
     */
    detectFeatureClass(feature: Feature): 'LINE' | 'NAVLINK' | 'MARKER' | 'PLACE' | 'ADDRESS' | 'AREA' | string | null {
        switch (feature.geometry.type) {
        case 'Point':
            return 'MARKER';
        case 'LineString':
            return 'LINE';
        case 'Polygon':
        case 'MultiPolygon':
            return 'AREA';
        }
    }

    getFeatureProperties(feature: Feature) {
        return feature.properties;
    }

    /**
     * Attribute reader for obtaining the zLevels of a Navlink feature.
     *
     * This method must be implemented to enable editing of {@link editor.Navlink | Navlinks}.
     *
     * @param navlink - the Navlink whose zLevels are requested
     *
     * @return An array containing the zLevel for each coordinate of the Navlink.
     */
    abstract readZLevels(navlink: Navlink): number[];

    /**
     * Attribute writer for writing the zLevels of a Navlink feature.
     *
     * This method must be implemented to enable editing of {@link editor.Navlink | Navlinks}.
     *
     * @param navlink - the Navlink whose zLevels should be set
     * @param zLevels - An array containing the zLevel for each coordinate of the Navlink
     *
     * @return An array containing the zLevel for each coordinate of the Navlink.
     */
    abstract writeZLevels(navlink: Navlink, zLevels: number[]);

    /**
     * Attribute reader for obtaining the direction of travel of a Navlink feature.
     *
     * This method must be implemented to enable editing of {@link editor.Navlink | Navlinks}.
     *
     * @param navlink - the Navlink whose direction is requested
     */
    abstract readDirection(navlink: Navlink): 'BOTH' | 'START_TO_END' | 'END_TO_START';

    /**
     * Attribute reader for obtaining if a Navlink feature can be accessed by pedestrians only.
     *
     * This method must be implemented to enable editing of {@link editor.Navlink | Navlinks}.
     *
     * @param navlink - the Navlink
     *
     * @returns true, if the Navlink can be accessed by pedestrians only, otherwise false.
     */
    abstract readPedestrianOnly(navlink: Navlink): boolean;

    /**
     * Attribute reader for obtaining the turn-restrictions of two Navlink Features.
     *
     * This method must be implemented to enable editing of {@link editor.Navlink | Navlinks}.
     *
     * @param turnFrom - The Navlink and it's coordinate index from which to turn from
     * @param turnTo - The Navlink and it's coordinate index to which you want to turn
     *
     * @returns true if turn is allowed, otherwise false.
     */
    abstract readTurnRestriction(turnFrom: { link: Navlink, index: number }, turnTo: { link: Navlink, index: number }): boolean;

    /**
     * Attribute writer to store turn-restrictions of two Navlink Features.
     *
     * This method must be implemented to enable editing of {@link editor.Navlink | Navlinks}.
     *
     * @param restricted - Indicates if the turn is allowed (true) or forbidden (false)
     * @param turnFrom - The Navlink and it's coordinate index from which to turn from
     * @param turnTo - The Navlink and it's coordinate index to which you want to turn
     */
    abstract writeTurnRestriction(restricted: boolean, turnFrom: { link: Navlink, index: number }, turnTo: { link: Navlink, index: number });

    /**
     * Attribute reader for obtaining the id of the TileProvider containing the corresponding Navlink, of an Address or Place feature, on which the RoutingPoint is located.
     *
     * This method must be implemented to enable editing of {@link editor.Place | Places} or {@link editor.Address | Addresses}.
     *
     * @param feature - The Address or Place feature whose RoutingProvider is requested.
     *
     * @returns the Id of the TileProvider in which the object is stored. If undefined is returned, the RoutingPoint's Navlink is assumed to be in the same TileProvider as the Address/Place.
     */
    abstract readRoutingProvider(feature: Feature): string | undefined; // return undefined -> provider itself acts as routing provider

    /**
     * Attribute reader for obtaining the RoutingPoint's geographical position of an Address or Place.
     * The geographical position must be located on the geometry of the related Navlink feature.
     *
     * This method must be implemented to enable editing of {@link editor.Place | Places} or {@link editor.Address | Addresses}.
     *
     * @param feature - The Address or Place feature whose RoutingProvider is requested.
     *
     * @returns GeoJSON Coordinate representing the geographical position of the RoutingPoint or null if a Place does not have a RoutingPoint.
     */
    abstract readRoutingPosition(feature: Feature): GeoJSONCoordinate | null;

    /**
     * Attribute reader for obtaining the id of the Navlink Feature on which the RoutingPoint of an Address or Place feature is located.
     * For Addresses an Id must be returned. If null is returned for a Place, the Place is treated as "floating" without a RoutingPoint.
     *
     * This method must be implemented to enable editing of {@link editor.Place | Places} or {@link editor.Address | Addresses}.
     *
     * @param feature - The Address or Place of which the Navlink of the RoutingPoint is requested.
     *
     * @returns the Id of the Navlink on which the RoutingPoint is located.
     */
    abstract readRoutingLink(feature: Feature): NavlinkId | null;

    /**
     * Attribute writer to store the RoutingPoint's geographical position of an Address or Place.
     * The geographical position must be located on the geometry of the related Navlink feature.
     *
     * This method must be implemented to enable editing of {@link editor.Place | Places} or {@link editor.Address | Addresses}.
     *
     * @param feature - The Address or Place feature whose RoutingPoint position to write.
     * @param position - the geographical position of the RoutingPoint.
     */
    abstract writeRoutingPosition(feature: Feature, position: GeoJSONCoordinate | null);

    /**
     * Attribute writer for storing the Navlink reference on which the RoutingPoint of an Address or Place feature is located.
     *
     * This method must be implemented to enable editing of {@link editor.Place | Places} or {@link editor.Address | Addresses}.
     *
     * @param feature - The Address or Place of which the Navlink reference of the RoutingPoint to store.
     * @param navlink - The navlink whose reference is to be written, or null in case of a Place becomes "floating" and has no RoutingPoint.
     *
     */
    abstract writeRoutingLink(feature: Feature, position, navlink: Navlink | null);

    /**
     * Attribute writer for storing the EditStates of a Feature.
     * The EditStates provide information about whether a feature has been created, modified, removed or split.
     *
     * By default EditStates aren't tracked/stored.
     *
     * @param feature - The Feature whose EditState should be written.
     * @param editState - the EditState to store
     */
    abstract writeEditState(feature: Feature, editState: 'created' | 'modified' | 'removed' | 'split');


    /**
     * Attribute reader for obtaining the Height of a Building (extruded {@link editor.Area | Area}).
     * The height must be specified in meters.
     *
     * This method must be implemented to enable editing of the height of an extruded {@link editor.Area | Area}.
     *
     * @param feature - The Area feature whose height is requested.
     *
     * @returns The height in meters of the Building/Area or null if the Area is considered flat.
     */
    abstract readFeatureHeight(feature: Feature): number | null;

    /**
     * Attribute writer for storing the Height of a Building (extruded {@link editor.Area | Area}).
     * The height must be specified in meters.
     *
     * This method must be implemented to enable editing of the height of an extruded {@link editor.Area | Area}.
     *
     * @param feature - The Area feature whose height should be updated/written.
     * @param height - The height specified in meters
     *
     */
    abstract writeFeatureHeight(feature: Feature, height: number| null);


    readRoutingPoint(location): { link: NavlinkId, position: GeoJSONCoordinate } {
        return {
            link: this.readRoutingLink(location),
            position: this.readRoutingPosition(location)
        };
    };

    blockFeature(feature, block) {
        const id = feature.id || feature;
        const type = typeof id;

        if (type == 'string' || type == 'number') {
            if (block) {
                this.blocked[id] = true;
            } else {
                delete this.blocked[id];
            }
        }
    };

    _insert(o, tile?) {
        if (this.blocked[o.id]) {
            return null;
        }
        return super._insert(o, tile);
    };

    reserveId(createdFeatures, cb) {
        setTimeout(() => cb(createdFeatures.map((f) => f.id)), 0);
    };

    // act as getter/setter
    isoCC(feature, isocc?: string | number) {
        // isoCC always valid -> no reverse geoc
        return true;
    };

    prepareFeature(feature: Feature): Feature {
        if (!feature.properties) {
            feature.properties = {};
        }
        if (feature.id == undefined) {
            feature.id = JSUtils.String.random();
        }
        return feature;
    }
}
