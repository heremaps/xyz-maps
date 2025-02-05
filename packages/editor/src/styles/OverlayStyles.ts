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

import {styleTools} from '@here/xyz-maps-display';
// @ts-ignore
import iconRotateBlack from '../../assets/icons/rotate.black.gif';
// @ts-ignore
import iconRotateWhite from '../../assets/icons/rotate.white.gif';
import {XYZLayerStyle} from '@here/xyz-maps-core';

let UNDEF;

const BLACK = '#111111';

const isHovered = (feature) => feature.properties['@ns:com:here:editor'].hovered;
const isSelected = (feature) => feature.properties['@ns:com:here:editor'].selected;

const getValue = (val, feature, zoomlevel: number) => {
    return typeof val == 'function' ? val(feature, zoomlevel) : val;
};


const createHighlightLineStyle = (use3d?: boolean) => [{
    zLayer: (feature) => feature.properties.zLayer,
    zIndex: 999990,
    type: 'Line',
    strokeWidth: 2,
    stroke: '#FF0000',
    altitude: !!use3d
}];

const createSelectorStyle = (use3d?: boolean) => {
    const styleGroup: any[] = [{
        zIndex: 4,
        type: 'Circle',
        strokeWidth: 2,
        stroke: '#FF0F00',
        radius: 20,
        pointerEvents: false,
        altitude: use3d
    }];

    if (use3d) {
        styleGroup.push({
            zIndex: 3,
            type: 'VerticalLine',
            stroke: BLACK,
            altitude: ({properties}) => properties[properties.parentType].altitude
        }, {
            zIndex: 1,
            type: 'Circle',
            radius: 4,
            fill: BLACK,
            opacity: .6,
            zLayer: ({properties}) => properties[properties.parentType].zLayer
        });
    }

    return styleGroup;
};

const createRoutingPointStyle = (use3d?: boolean) => use3d
    // 3d style
    ? [{
        zLayer: (feature) => feature.properties.zLayer,
        zIndex: 999992,
        type: 'Sphere',
        radius: 8,
        fill: '#FF0000',
        stroke: '#FF0000',
        altitude: ({properties}) => properties[properties.parentType].altitude
    }, {
        zLayer: (feature) => feature.properties.zLayer,
        zIndex: 999991,
        type: 'VerticalLine',
        stroke: '#000',
        altitude: true
    }, {
        zIndex: 999990,
        type: 'Circle',
        radius: 4,
        fill: BLACK,
        opacity: .6,
        altitude: 0,
        zLayer: (feature) => feature.properties.zLayer
    }]
    // 2d style
    : [{
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

class OverlayStyles extends XYZLayerStyle {
    styleGroups = {

        'ADDRESS_LINE': createHighlightLineStyle(),
        'ADDRESS_LINE_3D': createHighlightLineStyle(true),

        'ADDRESS_ROUTING_POINT': createRoutingPointStyle(),
        'ADDRESS_ROUTING_POINT_3D': createRoutingPointStyle(true),

        'ADDRESS_SELECTOR': createSelectorStyle(),
        'ADDRESS_SELECTOR_3D': createSelectorStyle(true),

        'PLACE_LINE': createHighlightLineStyle(),
        'PLACE_LINE_3D': createHighlightLineStyle(true),

        'PLACE_ROUTING_POINT': createRoutingPointStyle(),
        'PLACE_ROUTING_POINT_3D': createRoutingPointStyle(true),

        'AREA_SHAPE': [{
            zIndex: 0,
            zLayer: ({properties}) => properties.AREA.zLayer,
            type: 'Circle',
            strokeWidth: 2,
            stroke: BLACK,
            radius: (feature) => isHovered(feature) ? 8 : 6,
            fill: (feature, zoom) => {
                const {fill, stroke} = feature.properties.AREA.style[0];
                return isHovered(feature)
                    ? BLACK
                    : getValue(fill, feature, zoom) || getValue(stroke, feature, zoom);
            }
        }],

        'AREA_VIRTUAL_SHAPE': [{
            zIndex: 0,
            zLayer: ({properties}) => properties.AREA.zLayer,
            type: 'Circle',
            strokeWidth: 1,
            fill: BLACK,
            stroke: BLACK,
            radius: (feature) => isHovered(feature) ? 6 : 4
        }],

        'AREA_HEIGHT_KNOB': [{
            zIndex: 4,
            type: 'Sphere',
            altitude: true,
            fill: (feature, zoom) => {
                const {fill, stroke} = feature.properties.AREA.style[0];
                return isHovered(feature)
                    ? '#777'
                    : getValue(fill, feature, zoom) || getValue(stroke, feature, zoom);
            },
            radius: 10,
            offsetZ: 50
        }, {
            zIndex: 3,
            type: 'VerticalLine',
            stroke: '#000',
            offsetZ: 50
        }],

        'LINE_SHAPE_3D': [{
            zIndex: 4,
            type: (feature) => isSelected(feature) ? 'Sphere' : null,
            radius: (feature, zoom) => {
                const {style} = feature.properties.LINE;
                const [lineWidth] = styleTools.getLineWidth(style, feature.getLine(), zoom, 0);
                return (lineWidth / 2 + 4 ^ 0) + 6;
            },
            fill: 'red',
            opacity: .5,
            strokeWidth: 5,
            altitude: true
        }, {
            zIndex: 3,
            type: 'Sphere',
            alignment: 'map',
            radius: (feature, zoom) => {
                const {style} = feature.properties.LINE;
                const [lineWidth] = styleTools.getLineWidth(style, feature.getLine(), zoom, 0);
                return lineWidth / 2 + 4 ^ 0;
            },
            stroke: (feature, zoom) => {
                const style = feature.properties.LINE.style.filter((s) => s.type == 'Line');
                const last = style.length - 1;
                return getValue(style[last].stroke, feature, zoom) || 'BLACK';
            },
            fill: (feature, zoom) => {
                let style = feature.properties.LINE.style;
                return style.length > 1 ? getValue(style[0].stroke, feature, zoom) : '#e9e9e9';
            },
            strokeWidth: 2,
            altitude: true
            // depthTest: false
        },
        {
            zIndex: 2,
            type: 'VerticalLine',
            stroke: '#000'
        }, {
            zIndex: 9e5,
            type: 'Circle',
            radius: 4,
            fill: BLACK,
            opacity: .6,
            zLayer: ({properties}) => properties.LINE.zLayer
        }],
        'LINE_SHAPE': [{
            zIndex: 0,
            type: 'Circle',
            radius: (feature, zoom) => {
                const {style} = feature.properties.LINE;
                const [lineWidth] = styleTools.getLineWidth(style, feature.getLine(), zoom, 0);
                return lineWidth / 2 + 4 ^ 0;
            },
            stroke: (feature, zoom) => {
                const style = feature.properties.LINE.style.filter((s) => s.type == 'Line');
                const last = style.length - 1;
                return getValue(style[last].stroke, feature, zoom) || 'BLACK';
            },
            fill: (feature, zoom) => {
                let style = feature.properties.LINE.style;
                return style.length > 1 ? getValue(style[0].stroke, feature, zoom) : '#151515';
            },
            strokeWidth: 2
        }, {
            zIndex: 4,
            type: (feature) => isSelected(feature) ? 'Circle' : null,
            radius: (feature, zoom) => {
                const {style} = feature.properties.LINE;
                const [lineWidth] = styleTools.getLineWidth(style, feature.getLine(), zoom, 0);
                return (lineWidth / 2 + 4 ^ 0) + 6;
            },
            stroke: 'red',
            strokeWidth: 3
        }],

        'LINE_VIRTUAL_SHAPE': [{
            zIndex: 0,
            type: 'Circle',
            radius: (feature, zoom) => {
                const {style} = feature.properties.LINE;
                const [lineWidth] = styleTools.getLineWidth(style, feature.getLine(), zoom, 0);
                return lineWidth / 2 ^ 0;
            },
            fill: '#151515'
        }],
        'LINE_VIRTUAL_SHAPE_3D': [{
            zIndex: 3,
            type: 'Sphere',
            radius: (feature, zoom) => {
                const {style} = feature.properties.LINE;
                const [lineWidth] = styleTools.getLineWidth(style, feature.getLine(), zoom, 0);
                return lineWidth / 2 ^ 0;
            },
            fill: 'red',
            altitude: ({properties}) => properties.LINE.style.find((s) => s.altitude)?.altitude
            // depthTest: false
        }, {
            zIndex: 2,
            type: 'VerticalLine',
            stroke: '#000'
        }, {
            zIndex: 9e5,
            type: 'Circle',
            radius: 4,
            fill: BLACK,
            opacity: .6,
            zLayer: ({properties}) => properties.LINE.zLayer
        }],

        'MARKER_SELECTOR': createSelectorStyle(),
        'MARKER_SELECTOR_3D': createSelectorStyle(true),

        'PLACE_SELECTOR': createSelectorStyle(),
        'PLACE_SELECTOR_3D': createSelectorStyle(true),

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
        }, {
            zIndex: 1,
            type: (feature) => isSelected(feature) ? 'Circle' : null,
            radius: (feature) => isHovered(feature) ? 18 : 14,
            stroke: 'red',
            strokeWidth: 3
        }],

        'NAVLINK_SHAPE_3D': [{
            zIndex: 0,
            type: (feature) => feature.properties.isConnected
                ? 'Box'
                : 'Sphere',
            width: (feature) => isHovered(feature) ? 18 : 12,
            rotation: 45,
            radius: (feature) => isHovered(feature) ? 9 : 6,
            strokeWidth: 2,

            fill: (feature, zoom) => feature.isOverlapping()
                ? '#FFFFFF'
                : getValue(feature.properties.NAVLINK.style[0].stroke, feature, zoom),

            stroke: (feature) => feature.isOverlapping()
                ? '#FF0000'
                : '#FFFFFF',
            alignment: 'map',
            altitude: true
        }, {
            zIndex: 2,
            type: 'VerticalLine',
            stroke: '#000'
        }, {
            zIndex: 9e5,
            type: 'Circle',
            radius: 4,
            fill: BLACK,
            opacity: .6,
            zLayer: ({properties}) => properties.NAVLINK.zLayer
        }],

        'NAVLINK_VIRTUAL_SHAPE': [{
            zIndex: 1,
            type: 'Circle',
            radius: (feature, zoom) => {
                const {style} = feature.properties.NAVLINK;
                let [lw] = styleTools.getLineWidth(style, feature.getLink(), zoom, 0);
                return lw / 5;
            },
            opacity: .7,
            fill: BLACK,
            stroke: BLACK,
            strokeWidth: 2
        }],

        'NAVLINK_VIRTUAL_SHAPE_3D': [{
            zIndex: 1,
            type: 'Sphere',
            radius: (feature, zoom) => {
                const {style} = feature.properties.NAVLINK;
                let [lw] = styleTools.getLineWidth(style, feature.getLink(), zoom, 0);
                return lw / 5;
            },
            opacity: .7,
            fill: BLACK,
            stroke: BLACK,
            strokeWidth: 2,
            alignment: 'map',
            altitude: true
        }, {
            zIndex: 2,
            type: 'VerticalLine',
            stroke: '#000'
        }, {
            zIndex: 9e5,
            type: 'Circle',
            radius: 4,
            fill: BLACK,
            opacity: .6,
            zLayer: ({properties}) => properties.NAVLINK.zLayer
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

        'TRANSFORMER_TRANSLATE_KNOB': [{
            type: 'Circle',
            zIndex: 0,
            zLayer: 1e4,
            stroke: '#FFFFFF',
            fill: '#010B1E',
            strokeWidth: 3,
            opacity: 0.3,
            radius: 9
        }],

        'TRANSFORMER_ROTATE_KNOB': [{
            type: 'Image',
            zIndex: 4,
            zLayer: 1e4,
            src: ({properties}) => properties.hovered ? iconRotateWhite : iconRotateBlack,
            width: 18
        }],

        'TRANSFORMER_SCALE_KNOB': [{
            type: 'Circle',
            zIndex: 4,
            zLayer: 1e4,
            fill: ({properties}) => properties.hovered ? 'white' : 'black',
            radius: 9
        }, {
            zIndex: 5,
            zLayer: 1e4,
            type: 'Text',
            fill: ({properties}) => properties.hovered ? 'black' : 'white',
            font: '20px Arial',
            text: '\u2921'
        }],

        'TRANSFORMER_SCALE_BOX': [{
            type: 'Line',
            zIndex: 0,
            zLayer: 1e4,
            strokeDasharray: [4, 4],
            strokeWidth: 2,
            stroke: '#010B1E'
        }],

        'RANGESELECTOR_LINE': [{
            zIndex: 0,
            type: 'Line',
            stroke: 'white',
            strokeWidth: 23
        }, {
            zIndex: 1,
            type: 'Line',
            stroke: 'grey',
            strokeWidth: 20
        }, {
            zIndex: 2,
            type: 'Line',
            stroke: 'white',
            strokeWidth: 3,
            strokeDasharray: [5, 4],
            strokeLinecap: 'butt'
        }],

        'RANGESELECTOR_RANGE_MARKER': [{
            zIndex: 110,
            type: 'Rect',
            fill: '#fff',
            width: 2,
            height: 20,
            alignment: 'map',
            offsetY: 8
        }, {
            zIndex: 111,
            type: 'Circle',
            fill: '#000',
            radius: 7,
            alignment: 'map',
            stroke: '#fff',
            strokeWidth: 1,
            offsetY: 20
        }, {
            zIndex: 110,
            type: 'Circle',
            stroke: '#fff',
            radius: 5,
            alignment: 'map'
        }],

        'RANGESELECTOR_RANGE_LINE': [{
            zIndex: 4,
            type: 'Line',
            strokeWidth: 9,
            opacity: 0.75,
            stroke: '#fff'
        }],

        'UNKNOWN': [{
            zIndex: 0,
            type: 'Circle',
            strokeWidth: 1,
            stroke: '#FF0000',
            fill: '#0000FF',
            radius: 10
        }]
    };

    assign(feature) {
        const {styleGroups} = this;
        const {properties} = feature;
        let type = feature.class || properties.type;
        let is3d = false;

        if (
            type == 'LINE_SHAPE' || type == 'LINE_VIRTUAL_SHAPE' ||
            type == 'NAVLINK_SHAPE' || type == 'NAVLINK_VIRTUAL_SHAPE'
        ) {
            is3d = (properties.LINE || properties.NAVLINK).style.find((s) => s.altitude)?.altitude;
        } else if (type == 'MARKER_SELECTOR') {
            is3d = properties.MARKER.altitude;
            if (is3d == UNDEF) {
                is3d = !!feature.geometry.coordinates[2];
            }
        } else if (
            type == 'ADDRESS_ROUTING_POINT' || 'ADDRESS_LINE' || 'ADDRESS_SELECTOR' ||
            'PLACE_ROUTING_POINT' || 'PLACE_LINE' || 'PLACE_SELECTOR'
        ) {
            is3d = properties[properties.parentType]?.altitude;
        }

        if (is3d) {
            const type3d = type + '_3D';
            type = styleGroups[type3d] ? type3d : type;
        }

        return styleGroups[type] !== UNDEF ? type : 'UNKNOWN';
    }
};

export default OverlayStyles;
