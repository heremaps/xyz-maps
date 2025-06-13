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

import {wrapText} from './textUtils';
import {getRotatedBBox} from '../geometry';
import {GlyphManager} from './webgl/GlyphManager';
import {Feature, StyleZoomRange, webMercator, Style, StyleGroup, GeoJSONCoordinate} from '@here/xyz-maps-core';
import {Expression, ExpressionParser, geometry as geometryUtils, Color} from '@here/xyz-maps-common';
import toRGB = Color.toRGB;
import {StyleExpressionParser} from './Layers';

const glyphManager = GlyphManager.getInstance();


const {meterToPixel, pixelToMeter} = webMercator;

const getTileGridZoom = (zoom) => Math.min(zoom, 20) ^ 0;
const INFINITY = Infinity;
let UNDEF;

enum ValueType {
    Number,
    String,
    Color,
    // Size values can be defined in Meter or Pixel, needs to be parsed.
    Size,
    Boolean,
    Float
}

const parsePropertyNames = {
    'type': {value: ValueType.Number},
    'zIndex': {value: ValueType.Number},
    'fill': {value: ValueType.Color},
    'stroke': {value: ValueType.Color},
    'strokeWidth': {value: ValueType.Size},
    'radius': {value: ValueType.Size},
    'width': {value: ValueType.Size},
    'height': {value: ValueType.Size},
    'font': {value: ValueType.String},
    'text': {value: ValueType.String},
    'textRef': {value: ValueType.String},
    'offsetX': {value: ValueType.Size},
    'offsetY': {value: ValueType.Size},
    'alignment': {value: ValueType.String},
    'rotation': {value: ValueType.Size},
    'priority': {value: ValueType.Size},
    'repeat': {value: ValueType.Number},
    'collide': {value: ValueType.Size},
    'offset': {value: ValueType.Size},
    'from': {value: ValueType.Size},
    'to': {value: ValueType.Size},
    'checkLineSpace': {value: ValueType.Boolean},
    'extrude': {value: ValueType.Size},
    'extrudeBase': {value: ValueType.Size},
    'intensity': {value: ValueType.Float},
    'weight': {value: ValueType.Float},
    'opacity': {value: ValueType.Float},
    'strokeDasharray': {value: ValueType.Size}
};
const allowedFloatProperties: { [name: string]: true } = {};
for (let name in parsePropertyNames) {
    if (parsePropertyNames[name].value == ValueType.Float) {
        allowedFloatProperties[name] = true;
    }
}


const textRefCache = new Map();

export const getTextString = (style, feature: Feature, level: number) => {
    let text = getValue('text', style, feature, level);

    if (!text && style.textRef) {
        text = textRefCache.get(style.textRef);
        if (text == UNDEF) {
            text = new Function('f', 'return f.' + style.textRef);
            textRefCache.set(style.textRef, text);
        }
        text = text(feature, level);
    }

    if (text != '') {
        if (text !== UNDEF && typeof text != 'string') {
            text = String(text);
        }
        return text;
    }
};

export const fillMap = (searchMap, parseSizeValue: boolean, map = {}) => {
    let fixedZoomMap = {};
    for (let zoom in searchMap) {
        fixedZoomMap[Math.round(Number(zoom))] = searchMap[zoom];
    }
    for (let zoom = 1; zoom <= 20; zoom++) {
        map[zoom] = searchLerp(fixedZoomMap, zoom, parseSizeValue);
    }
    return map;
};

// const getValue = <
//     Property extends keyof Style,
//     Value = Style[Property],
//     Return = Value extends (...args: any[]) => any ? ReturnType<Value> : Exclude<Value,StyleZoomRange<any>>
//     >(property: Property, style: Style, feature: Feature, zoom: number): Return {
const getValue = (name: string, style: Style, feature: Feature, tileGridZoom: number, mode?: 0 | 1/* 0->Static mode, 1-> Dynamic mode*/) => {
    let value = style[name];

    if (value instanceof Expression) {
        return value.resolve(feature.properties, mode || 0);
    }

    value = typeof value == 'function'
        // @ts-ignore, 3rd param can be used internally
        ? value(feature, tileGridZoom, style, mode)
        : value;
    return value;
};

const parseSizeValue = (size: string | number, float: boolean = false): [number, string] => {
    let unit = 'px';
    let value = size;
    if (typeof size == 'string') {
        value = parseFloat(size) || 0;
        if (size.charAt(size.length - 1) == 'm') {
            unit = 'm';
            value = Math.round(value * 1e3) / 1e3; // mm
            return [value, unit];
        }
    }
    if (!float) {
        value = Math.round(value as number || 0); // no "float pixels"
        // value = <number>value ^ 0; // no "float pixels"
    }
    return [<number>value, unit];
};

const getSizeInPixel = (property: string, style: Style, feature: Feature, zoom: number, float?: boolean) => {
    const tileGridZoom = getTileGridZoom(zoom);
    const rawValue = getValue(property, style, feature, tileGridZoom);
    let [value, unit] = parseSizeValue(rawValue, float);

    if (unit == 'm') {
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

const getMaxZoom = (styles: StyleGroup, feature: Feature, zoom: number, layerIndex: number) => {
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


const getLineWidth = (groups: StyleGroup, feature: Feature, zoom: number, layerIndex: number, skip3d?: boolean): [number, number] => {
    let width = 0;
    let maxZ = 0;
    let style;
    const tileGridZoom = getTileGridZoom(zoom);


    for (let s = 0; s < groups.length; s++) {
        style = groups[s];
        const type = getValue('type', style, feature, tileGridZoom);

        if (type != 'Line') continue;

        if (!skip3d || !getValue('altitude', style, feature, tileGridZoom)) {
            let z = getAbsZ(style, feature, tileGridZoom, layerIndex);
            if (z > maxZ) {
                maxZ = z;
            }

            // let swVal = getValue('strokeWidth', grp, feature, tileGridZoom); // || 1;
            // if (isNaN(swVal)) swVal = 1;
            // let [value, unit] = parseSizeValue(swVal, true);
            // if (unit == 'm') {
            //     const dZoomScale = Math.pow(2, zoom % tileGridZoom);
            //     value = dZoomScale * meterToPixel(value, tileGridZoom);
            // }

            const value = getSizeInPixel('strokeWidth', style, feature, zoom, true);
            if (value > width) {
                width = value;
            }
        }
    }

    return [width, maxZ];
};

export const calcBBox = (style: Style, feature: Feature, zoom: number, dpr: number, bbox?: number[], skipStrokeColor?: boolean): number[] | null => {
    const tileGridZoom = getTileGridZoom(zoom);
    const type = getValue('type', style, feature, tileGridZoom);
    let offsetX = 0;
    let offsetY = 0;
    let x1;
    let x2;
    let y1;
    let y2;
    let w;
    let h;

    bbox = bbox || [INFINITY, INFINITY, -INFINITY, -INFINITY];

    const fill = getValue('fill', style, feature, tileGridZoom);
    const stroke = skipStrokeColor ? false : getValue('stroke', style, feature, tileGridZoom);

    if ( // it's not a icon..
        type != 'Image' &&
        // .. and no fill/stroke is defined
        !fill && !stroke
    ) {
        // -> it's not visible!
        return null;
    }


    if (type == 'Text') {
        const text = getTextString(style, feature, tileGridZoom);

        if (!text) {
            return null;
        }

        const strokeWidth = getValue('strokeWidth', style, feature, tileGridZoom);
        let font = getValue('font', style, feature, tileGridZoom);
        const _font = glyphManager.initFont({font, strokeWidth, fill, stroke /* textAlign */}, dpr);
        let lines;

        w = 0;

        if (feature.geometry.type == 'LineString' || feature.geometry.type == 'MultiLineString') {
            w = glyphManager.getTextWidth(text, _font);
            h = _font.letterHeight;
        } else {
            const lineWrap = getValue('lineWrap', style, feature, tileGridZoom);
            lines = wrapText(text, lineWrap);

            for (let line of lines) {
                let _w = glyphManager.getTextWidth(line, _font);
                if (_w > w) {
                    w = _w;
                }
            }
            h = lines.length * _font.letterHeight;
        }

        const textAnchor = getValue('textAnchor', style, feature, tileGridZoom);

        if (typeof textAnchor == 'string') {
            // if (textAnchor.startsWith('Top')) offsetY += h * .5;
            // else if (textAnchor.startsWith('Bottom')) offsetY -= h * .5;
            // if (textAnchor.endsWith('Left')) offsetX += w * .5;
            // else if (textAnchor.endsWith('Right')) offsetX -= w * .5;
            switch (textAnchor) {
            case 'Top':
                offsetY += h * .5;
                break;
            case 'TopLeft':
                offsetX += w * .5;
                offsetY += h * .5;
                break;
            case 'TopRight':
                offsetX -= w * .5;
                offsetY += h * .5;
                break;
            case 'Bottom':
                offsetY -= h * .5;
                break;
            case 'BottomLeft':
                offsetX += w * .5;
                offsetY -= h * .5;
                break;
            case 'BottomRight':
                offsetX -= w * .5;
                offsetY -= h * .5;
                break;
            }
        }
    } else {
        let strokeWidth = getValue('strokeWidth', style, feature, tileGridZoom); // || 1;

        if (isNaN(strokeWidth)) strokeWidth = 1;

        if (type == 'Circle') {
            w = 2 * getSizeInPixel('radius', style, feature, tileGridZoom) ^ 0;
            h = w;
        } else {
            w = getSizeInPixel('width', style, feature, tileGridZoom) ^ 0;
            h = getSizeInPixel('height', style, feature, tileGridZoom);
            h = (h || w) ^ 0;
        }

        h = h + strokeWidth;
        w += strokeWidth;
    }

    offsetX += getValue('offsetX', style, feature, tileGridZoom) ^ 0;
    offsetY += getValue('offsetY', style, feature, tileGridZoom) ^ 0;
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

    if (x1 < bbox[0]) {
        bbox[0] = x1;
    }
    if (x2 > bbox[2]) {
        bbox[2] = x2;
    }
    if (y1 < bbox[1]) {
        bbox[1] = y1;
    }
    if (y2 > bbox[3]) {
        bbox[3] = y2;
    }

    return bbox;
};


// uses for point geometries only
const getPixelSize = (groups: StyleGroup, feature: Feature, zoom: number, dpr: number, layerIndex: number, skip3d?: boolean): [number, number, number, number, number?] => {
    const tileGridZoom = getTileGridZoom(zoom);
    let maxZ = 0;
    let z;

    let combinedBBox;
    for (let style of groups) {
        if (skip3d && getValue('altitude', style, feature, tileGridZoom)) {
            continue;
        }

        const bbox = calcBBox(style, feature, zoom, dpr, combinedBBox, true);
        combinedBBox = bbox || combinedBBox;

        z = getAbsZ(style, feature, tileGridZoom, layerIndex);

        if (z > maxZ) {
            maxZ = z;
        }
    }
    if (combinedBBox) {
        combinedBBox[4] = maxZ;
        return combinedBBox;
    }
};


export const is3d = (groups: StyleGroup, feature: Feature, zoom: number): boolean => {
    const tileGridZoom = getTileGridZoom(zoom);
    for (let style of groups) {
        if (getValue('altitude', style, feature, tileGridZoom) || getValue('extrude', style, feature, tileGridZoom)) {
            return true;
        }
    }
    return false;
};

export const getExtrude = (groups: StyleGroup, feature: Feature, zoom: number): number | null => {
    const tileGridZoom = getTileGridZoom(zoom);
    for (let style of groups) {
        const extrude = getValue('extrude', style, feature, tileGridZoom);
        if (extrude) {
            return extrude;
        }
    }
    return null;
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
const searchLerp = (map, search: number, parseSize: boolean = true) => {
    let i = 0;
    let rawVal;
    let _v;
    let _unit;
    let _z: number;
    for (let zoom in map) {
        const z = Number(zoom);
        rawVal = map[z];

        const isColorValue = Array.isArray(rawVal);
        let value;
        let unit;

        if (isColorValue) {
            value = rawVal;
        } else if (parseSize) {
            [value, unit] = parseSizeValue(rawVal);
        } else {
            value = rawVal;
        }

        if (unit == 'px') {
            rawVal = value;
        }

        if (search <= z) {
            if (i == 0) return unit == 'm' ? map[z] : value;
            // rgba color ?
            if (isColorValue) {
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

export const parseColorMap = (map: { [zoom: string]: Color.RGBA }) => {
    for (let z in map) {
        map[z] = toRGB(map[z]);
    }
    return map;
};

export const createZoomRangeFunction = (map: StyleZoomRange<Color.RGBA>, /* isFeatureContext?:boolean,*/ parseSizeValue?: boolean) => {
    map = fillMap(map, parseSizeValue);
    // return new Function('f,zoom', `return (${JSON.stringify(map)})[zoom];`);
    const range = (feature, zoom: number) => {
        return map[zoom ?? feature];
    };
    range.map = map; // dbg
    return range;
};

const parseStyleGroup = (styleGroup: readonly(Style & { __p?: true })[], expParser: StyleExpressionParser) => {
    for (let style of styleGroup) {
        // process style only once
        if (style.__p) continue;
        for (let name in style) {
            if (name in parsePropertyNames) {
                const value = style[name];
                if (ExpressionParser.isJSONExp(value) && (
                    name != 'strokeDasharray' || isNaN(value[0].charAt(0))
                )) {
                    // if (name != 'strokeDasharray' || typeof parseInt(value[0]) != 'number') {
                    style[name] = expParser.parseJSON(value);
                    // }
                } else {
                    // check if value is a "StyleZoomRange"
                    if (value && typeof value == 'object' && !Array.isArray(value) &&
                        // skip Gradients
                        !value.type
                    ) {
                        if (name == 'stroke' || name == 'fill') {
                            // convert to [r,g,b,a]
                            parseColorMap(value);
                        }
                        const parseSizeValue = !allowedFloatProperties[name];
                        style[name] = createZoomRangeFunction(value, parseSizeValue);
                    }
                }
            }
        }
        style.__p = true;
    }
    return styleGroup;
};

export const getPolygonCenter = (style: Style, feature: Feature, zoom: number) => {
    const anchor = getValue('anchor', style, feature, zoom);
    const {geometry} = feature;
    let center;
    if (anchor == 'Centroid') {
        center = geometry._c ||= geometryUtils.centroid(<GeoJSONCoordinate[][]>(geometry.type == 'Polygon' ? geometry.coordinates : geometry.coordinates[0]));
    } else {
        center = geometry._pc;
        if (!center) {
            const {bbox} = feature;
            const minY = webMercator.lat2y(bbox[1], 1);
            const maxY = webMercator.lat2y(bbox[3], 1);
            const centerLat = webMercator.y2lat((maxY + minY) * .5, 1);
            center = geometry._pc = [(bbox[0] + bbox[2]) * 0.5, centerLat];
            // center = [(bbox[0] + bbox[2]) * 0.5, (bbox[1] + bbox[3]) * 0.5];
        }
    }
    return center;
};

export {
    getValue,
    parseSizeValue,
    getLineWidth,
    getPixelSize,
    getSizeInPixel,
    merge,
    isStyle,
    getMaxZoom,
    parseStyleGroup,
    StyleGroup,
    Style
};
