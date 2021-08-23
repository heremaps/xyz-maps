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

import {FeatureProvider as FeatureTileProvider} from './FeatureProvider';
import {Feature} from '../features/Feature';
import {JSUtils} from '@here/xyz-maps-common';
import {NavlinkSplitHook, NavlinkDisconnectHook, FeatureRemoveHook, CoordinatesUpdateHook} from '@here/xyz-maps-editor';
import {GeoJSONCoordinate} from '../features/GeoJSON';
import {TileProviderOptions} from './TileProvider/TileProviderOptions';

type FeatureClass = 'LINE' | 'NAVLINK' | 'MARKER' | 'PLACE' | 'ADDRESS' | 'AREA';

// type EditorFeature = { editState: (state?: string, value?) => any };

type NavlinkId = string | number;

type Navlink = Feature;

type TurnNode = {
    link: Navlink,
    index: number
};

/**
 *  Configuration options of a EditableFeatureProviderOptions.
 */
export interface EditableFeatureProviderOptions extends TileProviderOptions {
    /**
     *  Allow or prevent editing by the {@link editor.Editor} module.
     *
     *  @defaultValue false
     */
    editable?: boolean;
    /**
     * Add hook functions that will be called during the execution of the corresponding "editing operation".
     * The "hooks" option is a map with the "editing operation" as its key and the corresponding Hook or Array of Hook function(s) as its value.
     *
     * Available editing operations are 'Navlink.disconnect', 'Navlink.split', 'Feature.remove', 'Coordinates.remove'.
     *
     * @see {@link editor.Editor.addHook}
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
    }
};

/**
 * EditableFeatureProvider is an abstract FeatureTileProvider that can be edited using the {@link Editor} module.
 */
export abstract class EditableFeatureProvider extends FeatureTileProvider {
    _e: any;

    editable: boolean;
    /**
     * Hook functions that will be called during the execution of the corresponding "editing operation".
     * The "hooks" property is a map with the "editing operation" as its key and the corresponding Hook or Array of Hook function(s) as its value.
     *
     * Available editing operations are 'Navlink.disconnect', 'Navlink.split', 'Feature.remove', 'Coordinates.remove'.
     *
     * @see {@link editor.Editor.addHook}
     */
    hooks: {
        'Navlink.split'?: NavlinkSplitHook | NavlinkSplitHook[],
        'Navlink.disconnect'?: NavlinkDisconnectHook | NavlinkDisconnectHook[],
        'Feature.remove'?: FeatureRemoveHook | FeatureRemoveHook[],
        'Coordinates.update'?: CoordinatesUpdateHook | CoordinatesUpdateHook[]
    };

    private blocked = {};

    constructor(options: EditableFeatureProviderOptions) {
        super({editable: true, ...options});
    }


    detectFeatureClass(feature): FeatureClass | null {
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

    getFeatureProperties(feature) {
        return feature.properties;
    }

    abstract readZLevels(link: Navlink): number[];

    abstract writeZLevels(link: Navlink, zLevels: number[]);

    abstract readDirection(link: Navlink): 'BOTH' | 'START_TO_END' | 'END_TO_START';

    abstract readPedestrianOnly(link: Navlink): boolean;

    abstract readTurnRestriction(turnFrom: TurnNode, turnTo: TurnNode): boolean;

    abstract writeTurnRestriction(restricted: boolean, turnFrom: TurnNode, turnTo: TurnNode);

    abstract readRoutingProvider(location: Feature): string; // return undefined -> provider itself acts as routing provider

    abstract readRoutingPosition(feature): GeoJSONCoordinate;

    abstract readRoutingLink(feature): NavlinkId;

    abstract writeRoutingPosition(feature, position: GeoJSONCoordinate | null);

    abstract writeRoutingLink(location, link: Navlink | null);

    // by default edit states aren't tracked/stored
    abstract writeEditState(feature, editState: 'created' | 'modified' | 'removed' | 'split');


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
