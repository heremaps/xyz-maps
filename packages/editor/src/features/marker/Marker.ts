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

import {Feature} from '../feature/Feature';
import {Coordinate} from '@here/xyz-maps-core/src/features/GeoJSON';

/**
 *  @class
 *  @expose
 *  @public
 *  @extends here.xyz.maps.editor.features.Feature
 *  @name here.xyz.maps.editor.features.Marker
 *
 *  @constructor
 *  @param {(String|Number)=} id of the Marker
 *  @param {here.xyz.maps.editor.GeoCoordinate|here.xyz.maps.editor.PixelCoordinate} coord
 *      Coordinate of the object
 *  @param {here.xyz.maps.editor.features.Feature.Properties=} properties
 *      Properties of the marker feature.
 */
export class Marker extends Feature {
    /**
     *  The feature class of a Marker is "MARKER".
     */
    readonly class: 'MARKER';

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
