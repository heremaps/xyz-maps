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

import WikiStyles from './WikiStyles';

import {JSUtils} from '@here/xyz-maps-common';
const LINE = 'LineString';
const STATE_SELECTED = 'selected';
const STATE_HOVERED = 'hovered';
const STATE_MODIFIED = 'modified';

function WikiLineStyles() {
    const that = this;

    that[LINE] =
    {

        'default': [
            [0, {
                'stroke': '#580008',
                'strokeWidth': 16,
                'strokeLinejoin': 'round',
                'strokeLinecap': 'round',
                'strokeDasharray': 'none',
                'opacity': 1
            }],
            [1, {
                'stroke': '#e63d32',
                'strokeWidth': 12,
                'strokeLinejoin': 'round',
                'strokeLinecap': 'round',
                'strokeDasharray': 'none',
                'opacity': 1
            }]
            // [ 2, {
            //     'fill'    : '#000000',
            //     'textRef' : 'name'
            // }]
        ],

        'hovered': [
            [0, {
                'opacity': .8,
                'strokeWidth': 16,
                'stroke': '#222222'
            }]
        ],

        'modified': [
            [0, {
                opacity: 1,
                stroke: '#1BBADD'
            }]
        ],

        'selected': [
            [2, {
                'stroke': '#222222',
                'strokeWidth': 18
            }],
            [3, {
                'stroke': '#F9B708',
                'strokeWidth': 14
            }]
        ]
    };


    that['Point'] = {

        'default': [
            [0, {
                'fill': '#580008',
                'radius': 12,
                'opacity': 1
            }]
        ],
        'hovered': [
            [0, {
                'radius': 16
            }]
        ],

        'modified': [
            [0, {
                fill: '#1BBADD'
            }]
        ],

        'selected': [
            [0, {
                'radius': 14
            }]
        ]
    };


    that.assign = (feature, level) => {
        const props = feature['properties'];
        const editStates = props.editStates;
        const geometryType = feature.geometry.type;
        let style = that[geometryType]['default'];

        if ( editStates[STATE_SELECTED] ) {
            style = that.mergeStyles( style, that[geometryType][STATE_SELECTED] );
        } else if ( editStates[STATE_HOVERED] ) {
            style = that.mergeStyles( style, that[geometryType][STATE_HOVERED] );
        }

        if ( editStates[STATE_MODIFIED] ) {
            style = that.mergeStyles( style, that[geometryType][STATE_MODIFIED] );
        }

        return style;
    };
}

JSUtils.inheritClass(WikiStyles, WikiLineStyles);

export default WikiLineStyles;
