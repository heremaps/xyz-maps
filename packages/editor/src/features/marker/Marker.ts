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
     * Set the behavior options.
     * @experimental
     */
    behavior(options: {
        /**
         * The drag axis across which the marker is dragged upon user interaction.
         * Once "dragAxis" is set, "dragPlane" has no effect.
         * In case "dragAxis" and "dragPlane" are set, "dragPlane" is preferred.
         * In case "dragPlane" and "dragAxis" are both set, "dragPlane" is preferred.
         */
        dragAxis?: 'X' | 'Y' | 'Z' | [number, number, number]
        /**
         * The normal of the plane over which the marker is dragged upon user interaction.
         * Once "dragPlane" is set, "dragAxis" has no effect.
         */
        dragPlane?: 'XY' | 'XZ' | 'YZ' | [number, number, number]
    }): void;
    /**
     * Set the value of a specific behavior option.
     * @experimental
     */
    behavior(name: string, value: boolean | string | [number, number, number]): void;
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
         * The drag axis across which the marker is dragged upon user interaction.
         */
        dragAxis?: [number, number, number] | 'X' | 'Y' | 'Z' | null
        /**
         * The normal of the plane over which the marker is dragged upon user interaction.
         */
        dragPlane?: [number, number, number] | 'XY' | 'XZ' | 'YZ' | null
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
