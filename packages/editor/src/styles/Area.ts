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

const createAreaStyle = (zOrder: number, fill: string, stroke: string, sw?: number) => {
    return [{
        'zIndex': zOrder,
        'type': 'Polygon',
        'fill': fill,
        // 'fill' : function( feature, polygonindex ){ //fill
        //     return feature.properties.roofColor[polygonindex] || fill;
        // },
        'strokeWidth': sw || 1,
        'stroke': stroke || '#FFFFFF'
        // 'opacity'      : 1
        // ,'extrude' : function( feature, polygonindex )
        // {
        //     return feature.properties.height[ polygonindex ]^0;
        // }
    }];
};

class Area extends WikiStyles {
    constructor() {
        super();
        const that = this;
        const defaultStyle = createAreaStyle(0, '#B7BCBF', '#545758');

        that['styleGroups'] = {

            'default': defaultStyle,

            'selected': that.mergeStyles(defaultStyle, [{
                'zIndex': 0,
                'type': 'Polygon',
                'opacity': 0.5,
                'strokeWidth': 4
            }]),

            'modified': that.mergeStyles(defaultStyle, [{
                'zIndex': 0,
                'type': 'Polygon',
                'strokeWidth': 3,
                'stroke': '#1BBADD'
            }]),

            'hovered': that.mergeStyles(defaultStyle, [{
                'zIndex': 0,
                'type': 'Polygon',
                'fill': '#FF0000',
                'opacity': 0.5,
                'strokeWidth': 2
            }])
        };
    }

    assign(feature) {
        const that = this;
        const editStates = feature.editState();
        let group = 'default';

        if (editStates[that.STATE_SELECTED]) {
            group = 'selected';
        } else if (editStates[that.STATE_HOVERED]) {
            group = 'hovered';
        }
        if (editStates[that.STATE_MODIFIED]) {
            group = 'modified';
        }

        return group;
    };
}

export default Area;
