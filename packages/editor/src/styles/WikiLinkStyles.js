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
const STATE_SELECTED = 'selected';
const STATE_HOVERED = 'hovered';
const STATE_MODIFIED = 'modified';
const textRefName = 'properties.name';
// var textRefName = 'properties.userProperties.name';

function WikiLinkStyles() {
    const that = this;


    that['strokeWidthZoomScale'] = (level) => 1 + ( level - 18 ) * .2;

    // ********************* Road Styles *********************

    that['styleGroups'] = {

        // ************** Motorway **************
        '1': [
            {
                'zIndex': 0,
                'type': 'Line',
                'stroke': '#BE6B65',
                'strokeWidth': 16 *1*1,
                'strokeLinejoin': 'round',
                'strokeLinecap': 'round',
                'opacity': 1

            }, {
                'zIndex': 1,
                'type': 'Line',
                'stroke': '#E6A08C',
                'strokeWidth': 12 * 1,
                'strokeLinejoin': 'round',
                'strokeLinecap': 'round',
                'opacity': 1

            },
            {
                'zIndex': 2,
                'type': 'Text',
                'fill': '#000000',
                'textRef': textRefName

            }
        ],

        // **************** Main ****************
        '2': [
            {
                'zIndex': 0,
                'type': 'Line',
                'stroke': '#DAAC21',
                'strokeWidth': 14 *1,
                'strokeLinejoin': 'round',
                'strokeLinecap': 'round',
                'opacity': 1

            }, {
                'zIndex': 1,
                'type': 'Line',
                'stroke': '#FADC96',
                'strokeWidth': 10 *1,
                'strokeLinejoin': 'round',
                'strokeLinecap': 'round',
                'opacity': 1
            },
            {
                'zIndex': 2,
                'type': 'Text',
                'fill': '#000000',
                'textRef': textRefName

            }
        ],

        // **************** Local ****************
        '3': [
            {
                'zIndex': 0,
                'type': 'Line',

                'stroke': '#D7BE13',
                'strokeWidth': 14 *1,
                'strokeLinejoin': 'round',
                'strokeLinecap': 'round',
                'opacity': 1

            }, {
                'zIndex': 1,
                'type': 'Line',
                'stroke': '#F6F299',
                'strokeWidth': 10 *1,
                'strokeLinejoin': 'round',
                'strokeLinecap': 'round',
                'opacity': 1
            },
            {
                'zIndex': 2,
                'type': 'Text',

                'fill': '#000000',
                'textRef': textRefName

            }
        ],

        // ************* Residential *************
        '4': [
            {
                'zIndex': 0,
                'type': 'Line',
                'stroke': '#8C8E8E',
                'strokeWidth': 14 *1,
                'strokeLinejoin': 'round',
                'strokeLinecap': 'round',
                'opacity': 1
            }, {
                'zIndex': 1,
                'type': 'Line',
                'stroke': '#FFFFFF',
                'strokeWidth': 10 *1,
                'strokeLinejoin': 'round',
                'strokeLinecap': 'round',
                'opacity': 1
            },
            {
                'zIndex': 2,
                'type': 'Text',
                'fill': '#000000',
                'textRef': textRefName
            }
        ],
        // *************** Trail ***************
        '5': [
            {
                'zIndex': 0,
                'type': 'Line',
                'stroke': '#1C4409',
                'strokeWidth': 7 *1,
                'strokeLinejoin': 'round',
                'strokeLinecap': 'round',
                'opacity': 1
            }, {
                'zIndex': 1,
                'type': 'Line',
                'stroke': '#50A62B',
                'strokeWidth': 5 *1,
                'strokeLinejoin': 'round',
                'strokeLinecap': 'round',
                'opacity': 1

            }, {
                'zIndex': 2,
                'type': 'Text',
                'fill': '#000000',
                'textRef': textRefName
            }
        ],

        'hovered': [{
            'zIndex': 0,
            'type': 'Line',
            'opacity': .8,
            'strokeWidth': 16,
            'stroke': '#222222'
        }],

        'modified': [{
            zIndex: 0,
            type: 'Line',
            opacity: 1,
            stroke: '#1BBADD'
        }],

        'selected': [{
            'zIndex': 0,
            'type': 'Line',
            'opacity': 1,
            'strokeWidth': 18
        }]

    };


    // that[NAVLINK]['DD'] = {};
    //
    // for( var fc = 5; fc>0; fc-- )
    // {
    //     var dds = that[NAVLINK]['DD'][fc] = JSON.parse( JSON.stringify( that[NAVLINK][fc] ) );
    //
    //     dds[2][0] = 3;
    //
    //     dds.splice(2,0,[2,{
    //         'stroke'           : '#FF0000',
    //         "strokeWidth"     : 2,
    //         'strokeLinejoin'  : 'round',
    //         'strokeLinecap'   : 'round',
    //         'strokeDasharray' : [4,4],
    //         'opacity'          : 1
    //     }]);
    // }


    that.assign = (feature, level) => {
        const attrs = feature['properties'] || {};
        const editStates = feature.editState();
        let fc = attrs['fc'] || 5;
        const access = attrs['access'];

        if ( fc == 5 && access != 16 && access != 528 ) {
            fc = 4;
        }

        fc = fc > 5 ? 5 : fc;

        // if( (attrs.dd || 0) != 0 )
        // {
        //     var style = that[NAVLINK]['DD'][fc];
        // }
        // else
        // {
        // var style = that['styleGroups'][fc];
        // }
        // if( (level < 15 && fc == 5) || (level<13 && fc > 3) )return;

        let style = that['styleGroups'][fc];

        if ( editStates[STATE_SELECTED] ) {
            style = that.mergeStyles( style, that['styleGroups'][STATE_SELECTED] );
        } else if ( editStates[STATE_HOVERED] ) {
            style = that.mergeStyles( style, that['styleGroups'][STATE_HOVERED] );
        }

        if ( editStates[STATE_MODIFIED] ) {
            style = that.mergeStyles( style, that['styleGroups'][STATE_MODIFIED] );
        }

        return style;
    };
}

JSUtils.inheritClass(WikiStyles, WikiLinkStyles);

export default WikiLinkStyles;
