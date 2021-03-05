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
import {Feature} from '@here/xyz-maps-core';
import {toRGB} from './webgl/color';
import {getRotatedBBox} from '../geometry';
import {webMercator, Style, StyleGroup} from '@here/xyz-maps-core';

const {meterToPixel, pixelToMeter} = webMercator;

const getTileGridZoom = (zoom) => Math.min(zoom, 20) ^ 0;
const INFINITY = Infinity;
let UNDEF;

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

const getValue = (name: string, style: Style, feature: Feature, tileGridZoom: number) => {
    let value = style[name];

    return typeof value == 'function'
        ? value(feature, tileGridZoom, style)
        : value;
};

const parseSizeValue = (size: string | number) => {
    let unit = 'px';
    let value = size;
    if (typeof size == 'string') {
        value = parseFloat(size) || 0;
        if (size.charAt(size.length - 1) == 'm') {
            unit = 'm';
            value = Math.round(value * 10) / 10;
            return {value, unit};
        }
    }
    value = <number>value ^ 0; // no "float pixels"
    return {value, unit};
};

const getSizeInPixel = (property: string, style: Style, feature: Feature, zoom: number) => {
    const rawValue = getValue(property, style, feature, zoom);
    let {value, unit} = parseSizeValue(rawValue);

    if (unit == 'm') {
        const tileGridZoom = getTileGridZoom(zoom);
        const dZoomScale = Math.pow(2, zoom % tileGridZoom);
        value = dZoomScale * meterToPixel(value, tileGridZoom);
    }
    return value;
};


const getAbsZ = (style: Style, feature: Feature, tileGridZoom: number, layerIndex: number) => {
    let z = getValue('zIndex', style, feature, tileGridZoom);
    let zLayer = getValue('zLayer', style, feature, tileGridZoom);

    if (typeof zLayer != 'number') {
        zLayer = layerIndex + 1;
    }
    return zLayer * 1e6 + z;
};

const getMaxZoom = (styles: StyleGroup, feature, zoom: number, layerIndex: number) => {
    let maxZ = 0;
    const tileGridZoom = getTileGridZoom(zoom);
    for (let style of styles) {
        let z = getAbsZ(style, feature, tileGridZoom, layerIndex);
        if (z > maxZ) {
            maxZ = z;
        }
    }
    return maxZ;
};


const getLineWidth = (groups: StyleGroup, feature: Feature, zoom: number, layerIndex: number): [number, number] => {
    let width = 0;
    let maxZ = 0;
    let grp;
    const tileGridZoom = getTileGridZoom(zoom);

    for (let s = 0; s < groups.length; s++) {
        grp = groups[s];

        let z = getAbsZ(grp, feature, tileGridZoom, layerIndex);
        if (z > maxZ) {
            maxZ = z;
        }

        const swVal = getValue('strokeWidth', grp, feature, tileGridZoom) || 1;
        let {value, unit} = parseSizeValue(swVal);

        if (unit == 'm') {
            const dZoomScale = Math.pow(2, zoom % tileGridZoom);
            value = dZoomScale * meterToPixel(value, tileGridZoom);
        }

        if (value > width) {
            width = value;
        }
    }

    return [width, maxZ];
};
// uses for point geometries only
const getPixelSize = (groups: StyleGroup, feature: Feature, zoom: number, layerIndex: number): [number, number, number, number, number?] => {
    const tileGridZoom = getTileGridZoom(zoom);
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

        let z = getAbsZ(style, feature, tileGridZoom, layerIndex);

        if (z > maxZ) {
            maxZ = z;
        }

        type = getValue('type', style, feature, tileGridZoom);

        if ( // it's not a picture..
            type != 'Image' &&
            // .. and no fill is defined
            !getValue('fill', style, feature, tileGridZoom)
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
                w = 2 * getSizeInPixel('radius', style, feature, zoom) ^ 0;
                h = w;
            } else {
                w = getSizeInPixel('width', style, feature, zoom) ^ 0;
                h = getSizeInPixel('height', style, feature, zoom);
                // w = getValue('width', style, feature, zoom) ^ 0;
                // h = getValue('height', style, feature, zoom);
                h = h == UNDEF ? w : h ^ 0;
            }

            h = h + sw;
            w += sw;
        }

        let offsetX = getValue('offsetX', style, feature, tileGridZoom) ^ 0;
        let offsetY = getValue('offsetY', style, feature, tileGridZoom) ^ 0;
        let rotation = type != 'Circle' && getValue('rotation', style, feature, tileGridZoom) ^ 0;

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
};


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
const searchLerp = (map, search: number) => {
    let i = 0;
    let rawVal;
    let _v;
    let _unit;
    let _z: number;
    for (let zoom in map) {
        const z = Number(zoom);
        rawVal = map[z];
        const {value, unit} = parseSizeValue(rawVal);

        if (unit == 'px') {
            rawVal = value;
        }

        if (search <= z) {
            if (i == 0) return unit == 'm' ? map[z] : value;
            // rgba color ?
            if (Array.isArray(value)) {
                let a = [];
                for (let j = 0; j < value.length; j++) {
                    a[j] = range(_z, z, _v[j], value[j], search);
                }
                return a;
            }

            if (z - _z > 1) {
                let v1 = _v;
                let v2 = value;
                let mixedUnits = unit != _unit;
                let isCurrentUnitInMeter = unit == 'm';
                if (mixedUnits) {
                    // mix meter and pixel units -> convert to meters
                    if (isCurrentUnitInMeter) {
                        v1 = pixelToMeter(v1, _z);
                    } else {
                        v2 = pixelToMeter(v2, z);
                    }
                }
                const interpolatedValue = range(_z, z, v1, v2, search);
                return <any>interpolatedValue + (mixedUnits || isCurrentUnitInMeter ? 'm' : 0);
            }
            return rawVal;
        }
        _z = z;
        _v = value;
        _unit = unit;
        i++;
    }
    return rawVal;
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

const createZoomRangeFunction = (map) => {
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
                        style[name] = createZoomRangeFunction(map);
                    }
                }
            }
        }
    }
};


export {
    getValue,
    parseSizeValue,
    getLineWidth,
    getPixelSize,
    merge,
    isStyle,
    getMaxZoom,
    parseStyleGroup,
    StyleGroup,
    Style
};
