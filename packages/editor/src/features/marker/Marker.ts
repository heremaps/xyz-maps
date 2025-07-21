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
import oTools from '../area/PolygonTools';

type DefaultBehavior = {
    dragAxis?: [number, number, number] | 'Z'
    dragPlane?: [number, number, number] | 'XY'
}

const defaultBehavior: DefaultBehavior = {
    dragPlane: 'XY'
};

/**
 * The Marker Feature is a generic editable Feature with "Point" geometry.
 * The Feature can be edited with the {@link Editor}.
 */
export class Marker extends Feature {
    /**
     *  The feature class of a Marker Feature is "MARKER".
     */
    readonly class: 'MARKER' | string;

    /**
     * Set or get interaction behavior for the marker.
     * @experimental
     */
    behavior(): {
        /**
         * The axis along which the marker can be dragged.
         * Has no effect if `dragPlane` or `dragSurface` is set.
         */
        dragAxis?: [number, number, number] | 'X' | 'Y' | 'Z' | null

        /**
         * The normal of the plane over which the marker is dragged.
         * Overrides `dragAxis` if both are set.
         * Has no effect if `dragSurface` is set.
         */
        dragPlane?: [number, number, number] | 'XY' | 'XZ' | 'YZ' | null

        /**
         * The surface over which the marker is dragged.
         * Takes precedence over `dragPlane` and `dragAxis` if set.
         */
        dragSurface?: 'terrain' | null
    };

    behavior(option: string): any;

    behavior(name: string, value: boolean | string | [number, number, number]): void;

    /**
     * Configure drag behavior with multiple options at once.
     * @experimental
     */
    behavior(options: {
        /**
         * The axis along which the marker can be dragged.
         * Ignored if `dragPlane` or `dragSurface` is set.
         */
        dragAxis?: [number, number, number] | 'X' | 'Y' | 'Z'

        /**
         * The normal of the plane over which the marker is dragged.
         * Overrides `dragAxis` if both are set.
         * Ignored if `dragSurface` is set.
         */
        dragPlane?: [number, number, number] | 'XY' | 'XZ' | 'YZ'

        /**
         * The surface over which the marker is dragged.
         * Takes precedence over both `dragPlane` and `dragAxis`.
         */
        dragSurface?: 'terrain'
    }): void;

    behavior(options?: any, value?: boolean) {
        let behavior = oTools.private(this, 'b') || {...defaultBehavior};

        switch (arguments.length) {
        case 0:
            return behavior;
        case 1:
            if (typeof options == 'string') {
                // getter
                return behavior[options];
            }
            break;
        case 2:
            const opt = {};
            opt[options] = value;
            options = opt;
        }
        // setter
        behavior = {...behavior, ...options};

        if (options.dragPlane) {
            delete behavior.dragAxis;
        } else if (options.dragAxis) {
            delete behavior.dragPlane;
        }

        this.__.b = behavior;
    }

    // /**
    //  *  Get the current position/coordinate of the feature.
    //  */
    // coord(): [number, number, number?];
    // /**
    //  *  Set the postion/coordinate of the feature.
    //  *
    //  *  @param coordinates - the new positioncoordinate that should be set for the feature
    //  */
    // coord(coordinates: [number, number, number?]);

    // constructor() {
    //     BasicFeature.apply(this, arguments);
    // }
}

(<any>Marker.prototype).class = 'MARKER';
