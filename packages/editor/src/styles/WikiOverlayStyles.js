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

import iconArrow from '../../assets/icons/arrow.gif';
import iconArrowHint from '../../assets/icons/arrow.hint.gif';
import iconArrowDirHint from '../../assets/icons/arrow.d.hint.gif';
import iconCar from '../../assets/icons/car.gif';
import iconOneway from '../../assets/icons/oneway_24.gif';
import iconForbidden from '../../assets/icons/noentry_24.gif';
import iconAllowed from '../../assets/icons/thoroughfare_24.gif';
import iconPedestrian from '../../assets/icons/pedestrian_24.gif';

// import iconPointA from '../../assets/icons/pointA.gif';
// import iconPointB from '../../assets/icons/pointB.gif';


let UNDEF;

const BLACK = '#111111';

const isHovered = (feature) => feature.properties['@ns:com:here:editor'].hovered;

const createHighlightLineStyle = () => [{
    'zIndex': 0,
    'type': 'Line',
    'strokeWidth': 2,
    'stroke': '#FF0000'
}];

const createSelectorStyle = () => [{
    'zIndex': 0,
    'type': 'Circle',
    'strokeWidth': 2,
    'stroke': '#FF0F00',
    'radius': 20
}];

const createRoutingPointStyle = () => [{
    'zIndex': 0,
    'type': 'Circle',
    'radius': 8,
    'fill': '#FF0000',
    'stroke': '#FF0000'
}, {
    'zIndex': 1,
    'type': 'Circle',
    'radius': 5,
    'fill': '#FF0000',
    'stroke': '#FFFFFF',
    'strokeWidth': 2
}];

const createDirectionHintStyle = (dir) => [{
    'zIndex': 0,
    'type': 'Circle',
    'radius': 13,
    'fill': '#ffffff',
    'stroke': BLACK,
    'strokeWidth': 1.5
}, {
    'zIndex': 1,
    'type': 'Text',
    'fill': BLACK,
    'font': 'normal 16px Arial',
    'text': dir
}];

const createTurnrestrictionSign = (src) => [{
    'zIndex': 1,
    'type': 'Image',
    'src': src,
    'width': 24,
    'height': 24,
    'rotation': (feature) => feature.properties.rotation
}];

const OverlayStyles = function() {
    this.styleGroups = {

        'ADDRESS_LINE': createHighlightLineStyle(),

        'ADDRESS_ROUTING_POINT': createRoutingPointStyle(),

        'ADDRESS_SELECTOR': createSelectorStyle(),

        'PLACE_LINE': createHighlightLineStyle(),

        'PLACE_ROUTING_POINT': createRoutingPointStyle(),

        'AREA_SHAPE': [{
            'zIndex': 0,
            'type': 'Circle',
            'strokeWidth': 2,
            'stroke': BLACK,
            'radius': (feature) => isHovered(feature) ? 6 : 4,
            'fill': (feature) => isHovered(feature)
                ? BLACK
                : feature.properties['AREA'].style[0].fill
        }],

        'AREA_VIRTUAL_SHAPE': [{
            'zIndex': 0,
            'type': 'Circle',
            'strokeWidth': 1,
            'fill': BLACK,
            'stroke': BLACK,
            'radius': (feature) => isHovered(feature) ? 5 : 3
        }],

        'LINE_SHAPE': [{
            zIndex: 0,
            type: 'Circle',
            radius: (feature) => {
                const style = feature.properties.LINE.style[0];
                return style.strokeWidth / 2 + 4 ^ 0;
            },
            stroke: (feature) => {
                const style = feature.properties.LINE.style.filter((s) => s.type == 'Line');
                const last = style.length - 1;
                return last > 0 ? style[last].stroke : BLACK;
            },
            fill: (feature) => {
                let style = feature.properties.LINE.style;
                return style.length > 1 ? style[0].stroke : '#151515';
            },
            strokeWidth: 2
        }],

        'LINE_VIRTUAL_SHAPE': [{
            zIndex: 0,
            type: 'Circle',
            radius: (feature) => feature.properties.LINE.style[0].strokeWidth / 2 ^ 0,
            fill: '#151515'
        }],

        'MARKER_SELECTOR': createSelectorStyle(),

        'PLACE_SELECTOR': createSelectorStyle(),

        'NAVLINK_SHAPE': [{
            'zIndex': 0,
            'type': (feature) => feature.properties.isConnected
                ? 'Rect'
                : 'Circle',
            'width': (feature) => isHovered(feature) ? 18 : 12,
            'rotation': 45,
            'radius': (feature) => isHovered(feature) ? 9 : 6,
            'strokeWidth': 2,

            'fill': (feature) => feature.isOverlapping()
                ? '#FFFFFF'
                : feature.properties.NAVLINK.style[0].stroke,

            'stroke': (feature) => feature.isOverlapping()
                ? '#FF0000'
                : '#FFFFFF'
        }],

        'NAVLINK_VIRTUAL_SHAPE': [{
            'zIndex': 1,
            'type': 'Circle',
            'radius': (feature) => feature.properties.NAVLINK.style[0]['strokeWidth'] / 5,
            'opacity': .7,
            'fill': BLACK,
            'stroke': BLACK,
            'strokeWidth': 2
        }],

        'NAVLINK_DIRECTION_HINT_1WAY': [{
            'zIndex': 1,
            'type': 'Image',
            'src': iconArrowHint,
            'rotation': (feature) => feature.properties.bearing,
            'width': 31,
            'height': 12
        }],

        'NAVLINK_DIRECTION_HINT_2WAY': [{
            'zIndex': 1,
            'type': 'Image',
            'src': iconArrowDirHint,
            'rotation': (feature) => feature.properties.bearing,
            'width': 31,
            'height': 12
        }],

        'NAVLINK_DIRECTION_HINT_BLOCKED': [{
            'zIndex': 1,
            'type': 'Image',
            'src': iconOneway,
            'rotation': 90,
            'width': 24,
            'height': 24
        }],

        'NAVLINK_DIRECTION_HINT_A': createDirectionHintStyle('A'),

        'NAVLINK_DIRECTION_HINT_B': createDirectionHintStyle('B'),

        'NAVLINK_DIRECTION': [{
            'zIndex': 0,
            'type': 'Image',
            'src': iconArrow,
            'width': 16,
            'height': 28,
            'rotation': (feature) => -feature.properties.bearing,
            'opacity': 0.7
        }],

        'NAVLINK_DIRECTION_NONE': [{
            'zIndex': 0,
            'type': 'Image',
            'src': iconOneway,
            'width': 24,
            'height': 24,
            'rotation': 90
        }],

        'TURN_RESTRICTION_START': [{
            'type': 'Image',
            'zIndex': 1,
            'src': iconCar,
            'width': 36,
            'height': 20,
            'rotation': (feature) => feature.properties.rotation
        }],

        'TURN_RESTRICTION_LINE': [{
            'type': 'Line',
            'zIndex': 0,
            'strokeWidth': 5,
            'strokeLinecap': 'round',
            'stroke': (feature) => feature.properties.sign == 'TURN_RESTRICTION_ALLOWED'
                ? '#0000ff'
                : '#ff0000'
        }],

        'TURN_RESTRICTION_ONEWAY': createTurnrestrictionSign(iconOneway),
        'TURN_RESTRICTION_FORBIDDEN': createTurnrestrictionSign(iconForbidden),
        'TURN_RESTRICTION_ALLOWED': createTurnrestrictionSign(iconAllowed),
        'TURN_RESTRICTION_PEDESTRIAN': createTurnrestrictionSign(iconPedestrian),

        'UNKNOWN': [{
            'zIndex': 0,
            'type': 'Circle',
            'strokeWidth': 1,
            'stroke': '#FF0000',
            'fill': '#0000FF',
            'radius': 10
        }]
    };

    this.assign = (feature) => {
        const type = feature.class || feature.properties.type;
        return this.styleGroups[type] !== UNDEF ? type : 'UNKNOWN';
    };
};

export default OverlayStyles;
