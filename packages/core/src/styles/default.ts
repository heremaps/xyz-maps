/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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

const POINT = [{
    zIndex: 0,
    type: 'Circle',
    radius: 6,
    fill: '#ff0000'
}];

const LINESTRING = [{
    zIndex: 0,
    type: 'Line',
    strokeWidth: 10,
    stroke: '#ff0000'
}];

const POLYGON = [{
    zIndex: 0,
    type: 'Polygon',
    strokeWidth: 1,
    stroke: '#ffffff',
    fill: '#ff0000'
}];

export default {

    styleGroups: {

        'Point': POINT,

        'MultiPoint': POINT,

        'LineString': LINESTRING,

        'MultiLineString': LINESTRING,

        'Polygon': POLYGON,

        'MultiPolygon': POLYGON

    },

    assign: ( feature ) => {
        return feature.geometry.type;
    }

};
