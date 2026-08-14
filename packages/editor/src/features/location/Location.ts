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
import oTools from './LocationTools';
import {Navlink} from '../link/Navlink';
import {GeoJSONCoordinate} from '@here/xyz-maps-core';
import {Marker} from '../marker/Marker';
import {isAutoResolveRoutingPointEnabled} from '../../API/EditorOptions';

const getAutoResolveRoutingPoint = (feature: Location) => {
    return isAutoResolveRoutingPointEnabled(feature._e()._config,
        feature.class);
};

type LocationBehavior = {
    autoResolveRoutingPoint?: boolean;
    dragAxis?: [number, number, number] | 'X' | 'Y' | 'Z' | null;
    dragPlane?: [number, number, number] | 'XY' | 'XZ' | 'YZ' | null;
    dragSurface?: 'terrain' | null;
};

/**
 * @hidden
 */
export class Location extends Marker {
    readonly class: 'PLACE' | 'ADDRESS';

    /**
     * Set or get behavior options for the location.
     * @experimental
     */
    behavior(options: {
        /**
         * Automatically resolves to the nearest {@link Navlink} when no valid routing point exists.
         * Overrides the corresponding EditorOptions setting for this feature.
         */
        autoResolveRoutingPoint?: boolean,
        /**
         * The axis along which the location can be dragged.
         * Ignored if `dragPlane` or `dragSurface` is set.
         */
        dragAxis?: [number, number, number] | 'X' | 'Y' | 'Z',
        /**
         * The normal of the plane over which the location is dragged.
         * Overrides `dragAxis` if both are set.
         * Ignored if `dragSurface` is set.
         */
        dragPlane?: [number, number, number] | 'XY' | 'XZ' | 'YZ',
        /**
         * The surface over which the location is dragged.
         * Takes precedence over both `dragPlane` and `dragAxis`.
         */
        dragSurface?: 'terrain'
    }): void;
    /**
     * Set a specific behavior option.
     * @experimental
     */
    behavior(name: string, value: boolean | string | [number, number, number]): void;

    /**
     * Get a specific behavior option.
     * @experimental
     */
    behavior(option: string): any;

    /**
     * Get all behavior options for the location.
     * @experimental
     */
    behavior(): {
        /**
         * Includes the per-feature override and the global EditorOptions default.
         */
        autoResolveRoutingPoint: boolean;
        /**
         * The axis along which the location can be dragged.
         */
        dragAxis?: [number, number, number] | 'X' | 'Y' | 'Z' | null;
        /**
         * The normal of the plane over which the location is dragged.
         */
        dragPlane?: [number, number, number] | 'XY' | 'XZ' | 'YZ' | null;
        /**
         * The surface over which the location is dragged.
         */
        dragSurface?: 'terrain' | null;
    };

    behavior(options?: any, value?: boolean) {
        const argsLength = arguments.length;
        if (argsLength == 0) {
            const behavior: LocationBehavior = super.behavior();
            return {
                ...behavior,
                autoResolveRoutingPoint: behavior.autoResolveRoutingPoint ?? getAutoResolveRoutingPoint(this)
            };
        }
        if (argsLength == 1 && options === 'autoResolveRoutingPoint') {
            return super.behavior(options) ?? getAutoResolveRoutingPoint(this);
        }

        super.behavior(options, value);
    }

    constructor(feature, provider) {
        super(feature, provider);
    }

    /**
     *  Get the coordinate(s) of the feature.
     */
    coord(): GeoJSONCoordinate;
    /**
     *  Set the coordinate(s) of the feature.
     *
     *  @param coordinates - the coordinates that should be set.
     */
    coord(coordinate: GeoJSONCoordinate);

    coord(ccoordinate?: GeoJSONCoordinate): GeoJSONCoordinate {
        return super.coord(ccoordinate);
    }


    getBBox(): [number, number, number, number] {
        // because poi has display and routing point it's indexed as a line in r-tree for better search..
        // so the real bbox hast to be restored
        const geo = <[number, number]> this.geometry.coordinates;
        return [geo[0], geo[1], geo[0], geo[1]];
    };

    /**
     *  Get the Navlink Feature that the feature is linked to/ associated with.
     *
     *  @returns The Navlink Feature or null if the feature is not linked to a Navlink (floating).
     */
    getLink(): Navlink | null {
        const data = oTools.getRoutingData(this);
        let linkId = data.link;
        let link;

        if (linkId) {
            const provider = oTools.getRoutingProvider(this);
            link = provider && provider.search(data.link);
        }

        return link || null;
    };
}
