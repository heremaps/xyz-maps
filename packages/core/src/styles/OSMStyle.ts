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

export default {

    backgroundColor: '#555555',

    strokeWidthZoomScale: (level: number) => {
        return level > 17 ? 1 : level > 14 ? .5 : .25;
    },

    styleGroups: {
        'earth': [{zIndex: 1, type: 'Polygon', fill: '#555555'}],
        'landuse': [{zIndex: 2, type: 'Polygon', fill: '#666666'}],
        'water': [{zIndex: 3, type: 'Polygon', fill: '#353535'}],
        'roads': [{zIndex: 4, type: 'Line', stroke: '#ffffff', strokeWidth: 4}],
        'highway': [{zIndex: 5, type: 'Line', stroke: '#ffffff', strokeWidth: 6}],
        'buildings': [{zIndex: 6, type: 'Polygon', fill: '#999999'}]
    },

    assign: (feature, level?: number) => {
        const props = feature.properties;
        const kind = props.kind;
        const layer = props.layer; // the data layer of the feature
        const geom = feature.geometry.type;

        if (layer == 'water') {
            if (geom == 'LineString' || geom == 'MultiLineString') {
                return;
            }
        }
        if (layer == 'roads') {
            if (kind == 'rail' || kind == 'ferry') {
                return;
            }
            if (kind == 'highway') {
                return kind;
            }
        }
        return layer;
    }
};
