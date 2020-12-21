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

// @ts-ignore
import iconArrow from '../../assets/icons/arrow.gif';
// @ts-ignore
import iconArrowHint from '../../assets/icons/arrow.hint.gif';
// @ts-ignore
import iconArrowDirHint from '../../assets/icons/arrow.d.hint.gif';
// @ts-ignore
import iconCar from '../../assets/icons/car.gif';
// @ts-ignore
import iconOneway from '../../assets/icons/oneway_24.gif';
// @ts-ignore
import iconForbidden from '../../assets/icons/noentry_24.gif';
// @ts-ignore
import iconAllowed from '../../assets/icons/thoroughfare_24.gif';
// @ts-ignore
import iconPedestrian from '../../assets/icons/pedestrian_24.gif';

let UNDEF;

const BLACK = '#111111';

const isHovered = (feature) => feature.properties['@ns:com:here:editor'].hovered;

const getValue = (val, feature, zoomlevel: number) => {
    return typeof val == 'function' ? val(feature, zoomlevel) : val;
};


const createHighlightLineStyle = () => [{
    zLayer: (feature) => feature.properties.zLayer,
    zIndex: 999990,
    type: 'Line',
    strokeWidth: 2,
    stroke: '#FF0000'
}];

const createSelectorStyle = () => [{
    zIndex: 0,
    type: 'Circle',
    strokeWidth: 2,
    stroke: '#FF0F00',
    radius: 20
}];

const createRoutingPointStyle = () => [{
    zLayer: (feature) => feature.properties.zLayer,
    zIndex: 999991,
    type: 'Circle',
    radius: 8,
    fill: '#FF0000',
    stroke: '#FF0000'
}, {
    zLayer: (feature) => feature.properties.zLayer,
    zIndex: 999992,
    type: 'Circle',
    radius: 5,
    fill: '#FF0000',
    stroke: '#FFFFFF',
    strokeWidth: 2
}];

const createDirectionHintStyle = (dir) => [{
    zIndex: 0,
    type: 'Circle',
    radius: 13,
    fill: '#ffffff',
    stroke: BLACK,
    strokeWidth: 1.5
}, {
    zIndex: 1,
    type: 'Text',
    fill: BLACK,
    font: 'normal 16px Arial',
    text: dir
}];

const createTurnrestrictionSign = (src) => [{
    zIndex: 1,
    type: 'Image',
    src: src,
    width: 24,
    height: 24,
    alignment: 'map',
    rotation: (feature) => feature.properties.rotation
}];

class OverlayStyles {
    styleGroups = {

        'ADDRESS_LINE': createHighlightLineStyle(),

        'ADDRESS_ROUTING_POINT': createRoutingPointStyle(),

        'ADDRESS_SELECTOR': createSelectorStyle(),

        'PLACE_LINE': createHighlightLineStyle(),

        'PLACE_ROUTING_POINT': createRoutingPointStyle(),

        'AREA_SHAPE': [{
            zIndex: 0,
            type: 'Circle',
            strokeWidth: 2,
            stroke: BLACK,
            radius: (feature) => isHovered(feature) ? 6 : 4,
            fill: (feature, zoom) => isHovered(feature)
                ? BLACK
                : getValue(feature.properties['AREA'].style[0].fill, feature, zoom)
        }],

        'AREA_VIRTUAL_SHAPE': [{
            zIndex: 0,
            type: 'Circle',
            strokeWidth: 1,
            fill: BLACK,
            stroke: BLACK,
            radius: (feature) => isHovered(feature) ? 5 : 3
        }],

        'LINE_SHAPE': [{
            zIndex: 0,
            type: 'Circle',
            radius: (feature, zoom) => {
                const strokeWidth = feature.properties.LINE.style[0].strokeWidth;
                return getValue(strokeWidth, feature, zoom) / 2 + 4 ^ 0;
            },
            stroke: (feature, zoom) => {
                const style = feature.properties.LINE.style.filter((s) => s.type == 'Line');
                const last = style.length - 1;
                return last > 0 ? getValue(style[last].stroke, feature, zoom) : BLACK;
            },
            fill: (feature, zoom) => {
                let style = feature.properties.LINE.style;
                return style.length > 1 ? getValue(style[0].stroke, feature, zoom) : '#151515';
            },
            strokeWidth: 2
        }],

        'LINE_VIRTUAL_SHAPE': [{
            zIndex: 0,
            type: 'Circle',
            radius: (feature, zoom) => {
                const strokeWidth = feature.properties.LINE.style[0].strokeWidth;
                return getValue(strokeWidth, feature, zoom) / 2 ^ 0;
            },
            fill: '#151515'
        }],

        'MARKER_SELECTOR': createSelectorStyle(),

        'PLACE_SELECTOR': createSelectorStyle(),

        'NAVLINK_SHAPE': [{
            zIndex: 0,
            type: (feature) => feature.properties.isConnected
                ? 'Rect'
                : 'Circle',
            width: (feature) => isHovered(feature) ? 18 : 12,
            rotation: 45,
            radius: (feature) => isHovered(feature) ? 9 : 6,
            strokeWidth: 2,

            fill: (feature, zoom) => feature.isOverlapping()
                ? '#FFFFFF'
                : getValue(feature.properties.NAVLINK.style[0].stroke, feature, zoom),

            stroke: (feature) => feature.isOverlapping()
                ? '#FF0000'
                : '#FFFFFF'
        }],

        'NAVLINK_VIRTUAL_SHAPE': [{
            zIndex: 1,
            type: 'Circle',
            radius: (feature) => feature.properties.NAVLINK.style[0]['strokeWidth'] / 5,
            opacity: .7,
            fill: BLACK,
            stroke: BLACK,
            strokeWidth: 2
        }],

        'NAVLINK_DIRECTION_HINT_1WAY': [{
            zIndex: 1,
            type: 'Image',
            src: iconArrowHint,
            rotation: (feature) => feature.properties.bearing,
            width: 31,
            height: 12,
            alignment: 'map'
        }],

        'NAVLINK_DIRECTION_HINT_2WAY': [{
            zIndex: 1,
            type: 'Image',
            src: iconArrowDirHint,
            rotation: (feature) => feature.properties.bearing,
            width: 31,
            height: 12,
            alignment: 'map'
        }],

        'NAVLINK_DIRECTION_HINT_BLOCKED': [{
            zIndex: 1,
            type: 'Image',
            src: iconOneway,
            rotation: 90,
            width: 24,
            height: 24,
            alignment: 'map'
        }],

        'NAVLINK_DIRECTION_HINT_A': createDirectionHintStyle('A'),

        'NAVLINK_DIRECTION_HINT_B': createDirectionHintStyle('B'),

        'NAVLINK_DIRECTION': [{
            zIndex: 0,
            type: 'Image',
            src: iconArrow,
            width: 16,
            height: 28,
            rotation: (feature) => -feature.properties.bearing,
            opacity: 0.7,
            alignment: 'map'
        }],

        'NAVLINK_DIRECTION_NONE': [{
            zIndex: 0,
            type: 'Image',
            src: iconOneway,
            width: 24,
            height: 24,
            rotation: 90,
            alignment: 'map'
        }],

        'TURN_RESTRICTION_START': [{
            type: 'Image',
            zIndex: 1,
            src: iconCar,
            width: 36,
            height: 20,
            rotation: (feature) => feature.properties.rotation,
            alignment: 'map'
        }],

        'TURN_RESTRICTION_LINE': [{
            type: 'Line',
            zIndex: 0,
            strokeWidth: 5,
            strokeLinecap: 'round',
            stroke: (feature) => feature.properties.sign == 'TURN_RESTRICTION_ALLOWED'
                ? '#0000ff'
                : '#ff0000'
        }],

        'TURN_RESTRICTION_ONEWAY': createTurnrestrictionSign(iconOneway),
        'TURN_RESTRICTION_FORBIDDEN': createTurnrestrictionSign(iconForbidden),
        'TURN_RESTRICTION_ALLOWED': createTurnrestrictionSign(iconAllowed),
        'TURN_RESTRICTION_PEDESTRIAN': createTurnrestrictionSign(iconPedestrian),

        'UNKNOWN': [{
            zIndex: 0,
            type: 'Circle',
            strokeWidth: 1,
            stroke: '#FF0000',
            fill: '#0000FF',
            radius: 10
        }]
    }

    assign(feature) {
        const type = feature.class || feature.properties.type;
        return this.styleGroups[type] !== UNDEF ? type : 'UNKNOWN';
    }
};

export default OverlayStyles;
