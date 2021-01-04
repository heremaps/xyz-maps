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

import {createTxtRef, measure, defaultFont} from './fontCache';
import {features} from '@here/xyz-maps-core';
import {toRGB} from './webgl/color';
import {getRotatedBBox} from '../geometry';

const INFINITY = Infinity;
let UNDEF;

type Feature = features.Feature;
type styleStringFunction = (feature, zoom: number) => string | null | undefined;
type styleNumberFunction = (feature, zoom: number) => number | null | undefined;

// TODO: MOVE TO CORE WITH FULL SWITCH TO TS.
interface Style {
    type: 'Circle' | 'Rect' | 'Image' | 'Text' | 'Line' | 'Polygon';
    zIndex: number | styleNumberFunction;
    fill?: string | styleStringFunction;
    stroke?: string | styleStringFunction;
    strokeWidth?: number | styleNumberFunction;
    radius?: string | styleNumberFunction;
    width?: number | styleNumberFunction;
    height?: number | styleNumberFunction;
    font?: string | styleStringFunction;
    text?: string | number | boolean | styleStringFunction | styleNumberFunction;
    textRef?: string;
    offsetX?: number | styleNumberFunction;
    offsetY?: number | styleNumberFunction;
    alignment?: 'map' | 'viewport';
    rotation?: number;
    priority?: number;
    repeat?: number;
    offset?: number | styleNumberFunction;
    start?: number | styleNumberFunction;
    stop?: number | styleNumberFunction;
}

const allowedProperties = {
    'type': 1,
    'zIndex': 1,
    'fill': 1,
    'stroke': 1,
    'strokeWidth': 1,
    'radius': 1,
    'width': 1,
    'height': 1,
    'font': 1,
    'text': 1,
    'textRef': 1,
    'offsetX': 1,
    'offsetY': 1,
    'alignment': 1,
    'rotation': 1,
    'priority': 1,
    'repeat': 1,
    'collide': 1,
    'offset': 1,
    'from': 1,
    'to': 1
};

type StyleGroup = Array<Style>;

const getValue = (name: string, style: Style, feature: Feature, zoom: number) => {
    let value = style[name];

    return typeof value == 'function'
        ? value(feature, zoom, style)
        : value;
};

const getAbsZ = (style: Style, feature: Feature, zoom: number, layerIndex: number) => {
    let z = getValue('zIndex', style, feature, zoom);
    let zLayer = getValue('zLayer', style, feature, zoom);

    if (typeof zLayer != 'number') {
        zLayer = layerIndex + 1;
    }
    return zLayer * 1e6 + z;
};

const getMaxZoom = (styles: StyleGroup, feature, zoom: number, layerIndex: number) => {
    let maxZ = 0;
    for (let style of styles) {
        let z = getAbsZ(style, feature, zoom, layerIndex);
        if (z > maxZ) {
            maxZ = z;
        }
    }
    return maxZ;
};


const getStrokeWidth = (groups: StyleGroup, feature: Feature, zoom: number, layerIndex: number): [number, number] => {
    let width = 0;
    let maxZ = 0;
    let grp;

    for (let s = 0; s < groups.length; s++) {
        grp = groups[s];

        let z = getAbsZ(grp, feature, zoom, layerIndex);
        if (z > maxZ) {
            maxZ = z;
        }

        let w = getValue('strokeWidth', grp, feature, zoom) || 1;
        if (w > width) {
            width = w;
        }
    }
    return [width, maxZ];
};
// uses for point geometries only
const getPixelSize = (groups: StyleGroup, feature: Feature, zoom: number, layerIndex: number): [number, number, number, number, number?] => {
    let maxZ = 0;
    let minX = INFINITY;
    let maxX = -INFINITY;
    let minY = INFINITY;
    let maxY = -INFINITY;
    let sw;
    let style;
    let type;
    let w;
    let h;
    let x1;
    let x2;
    let y1;
    let y2;
    let text;
    let a;

    for (let s = 0; s < groups.length; s++) {
        style = groups[s];

        let z = getAbsZ(style, feature, zoom, layerIndex);

        if (z > maxZ) {
            maxZ = z;
        }

        type = getValue('type', style, feature, zoom);

        if ( // it's not a picture..
            type != 'Image' &&
                // .. and no fill is defined
                !getValue('fill', style, feature, zoom)
                // !style.fill
        ) {
            // -> it's not visible!
            continue;
        }


        if (type == 'Text') {
            text = style['text'];

            if (text == UNDEF) {
                text = createTxtRef(style['textRef'])(feature);
            }

            if (text == null) {
                continue;
            }

            a = measure(style.font || defaultFont);
            w = a * text.length;
            h = 14;
        } else {
            sw = getValue('strokeWidth', style, feature, zoom) || 1;

            if (type == 'Circle') {
                w = 2 * getValue('radius', style, feature, zoom) ^ 0;
                h = w;
            } else {
                w = getValue('width', style, feature, zoom) ^ 0;
                h = getValue('height', style, feature, zoom);
                h = h == UNDEF ? w : h ^ 0;
            }

            h = h + sw;
            w += sw;
        }

        let offsetX = getValue('offsetX', style, feature, zoom) ^ 0;
        let offsetY = getValue('offsetY', style, feature, zoom) ^ 0;
        let rotation = type != 'Circle' && getValue('rotation', style, feature, zoom) ^ 0;

        if (rotation) {
            const bbox = getRotatedBBox(rotation, w, h, offsetX, offsetY);
            x1 = bbox[0];
            y1 = bbox[1];
            x2 = bbox[2];
            y2 = bbox[3];
        } else {
            x1 = offsetX - (w * .5);
            x2 = x1 + w;

            y1 = offsetY - (h * .5);
            y2 = y1 + h;
        }

        if (x1 < minX) {
            minX = x1;
        }
        if (x2 > maxX) {
            maxX = x2;
        }
        if (y1 < minY) {
            minY = y1;
        }
        if (y2 > maxY) {
            maxY = y2;
        }
    }


    if (maxX != -INFINITY) {
        return [
            // offset-bottom-left
            minX,
            minY,
            // offset-top-right
            maxX,
            maxY,

            maxZ
        ];
    }
}
;


const merge = (style0: StyleGroup, style: StyleGroup): StyleGroup | null => {
    if (style === null || <any>style === false) {
        return null;
    }

    let lStyle;
    let mergedStyles = [];

    for (let i = 0, len = style0.length; i < len; i++) {
        lStyle = style0[i];

        mergedStyles.push([lStyle[0], {}]);

        for (let s in lStyle[1]) {
            mergedStyles[i][1][s] = lStyle[1][s];
        }

        if (style[i]) {
            mergedStyles[i][0] = style[i][0];

            for (let s in style[i][1]) {
                mergedStyles[i][1][s] = style[i][1][s];
            }
        }
    }
    return mergedStyles;
};

const isStyle = (style: Style): Boolean => {
    return style.type && style.zIndex != UNDEF;
};


const lerp = (x: number, y: number, a: number) => x * (1 - a) + y * a;
const invlerp = (x: number, y: number, a: number) => clamp((a - x) / (y - x));
const clamp = (a: number, min = 0, max = 1) => Math.min(max, Math.max(min, a));
const range = (x1: number, y1: number, x2: number, y2: number, a: number) => lerp(x2, y2, invlerp(x1, y1, a));
const searchLerp = (map, search) => {
    let i = 0;
    let v;
    let _v;
    let _z;
    for (let z in map) {
        v = map[z];
        if (search <= z) {
            if (i == 0) return v;
            if (Array.isArray(v)) {
                let a = [];
                for (let j = 0; j < v.length; j++) {
                    a[j] = range(_z, Number(z), _v[j], v[j], search);
                }
                return a;
            }
            return range(_z, Number(z), _v, v, search);
        }
        _z = z;
        _v = v;
        i++;
    }
    return v;
};
const fillMap = (map, searchMap) => {
    for (let zoom = 1; zoom <= 20; zoom++) {
        map[zoom] = searchLerp(searchMap, zoom);
    }
    return map;
};


const parseColors = (map) => {
    for (let z in map) {
        map[z] = toRGB(map[z]);
    }
};

const createZoomrangeFunction = (map) => {
    // const range = new Function('f,zoom', `return (${JSON.stringify(map)})[zoom];`);
    const range = (feature, zoom: number) => {
        return map[zoom];
    };
    range.map = map; // dbg

    return range;
};

const parseStyleGroup = (styleGroup: Style[]) => {
    if (!(<any>styleGroup).__p) {
        (<any>styleGroup).__p = true;
        for (let style of styleGroup) {
            for (let name in style) {
                if (name in allowedProperties) {
                    let value = style[name];
                    if (typeof value == 'object' && !Array.isArray(value)) {
                        // "zoomrange" value detected
                        if (name == 'stroke' || name == 'fill') {
                            // convert to [r,g,b,a]
                            parseColors(value);
                        }
                        let map = fillMap({}, value);
                        style[name] = createZoomrangeFunction(map);
                    }
                }
            }
        }
    }
};


export {getValue, getStrokeWidth, getPixelSize, merge, isStyle, getMaxZoom, parseStyleGroup, StyleGroup, Style};
