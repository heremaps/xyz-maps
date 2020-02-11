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

import {createTxtRef, measure, defaultFont} from './fontCache';
import {features} from '@here/xyz-maps-core';

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
}

type StyleGroup = Array<Style>;


const getValue = (name: string, style: Style, feature: Feature, zoom: number) => {
    let value = style[name];

    return typeof value == 'function'
        ? value(feature, zoom)
        : value;
};

const getStrokeWidth = (groups: StyleGroup, feature: Feature, zoom: number): [number, number] => {
    let width = 0;
    let maxZ = 0;
    let w;
    let z;
    let grp;

    for (let s = 0; s < groups.length; s++) {
        grp = groups[s];

        z = getValue('zIndex', grp, feature, zoom);
        if (z > maxZ) {
            maxZ = z;
        }

        w = getValue('strokeWidth', grp, feature, zoom) || 1;

        if (w > width) {
            width = w;
        }
    }

    return [width, maxZ];
};
// uses for point geometries only
const getPixelSize = (groups: StyleGroup, feature: Feature, zoom: number): [number, number, number, number, number?] => {
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
    let z;
    let text;
    let a;

    for (let s = 0; s < groups.length; s++) {
        z = getValue('zIndex', groups[s], feature, zoom);

        if (z > maxZ) {
            maxZ = z;
        }

        style = groups[s];
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

            // var a = 6.678;

            // w = 16;
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

        x1 = (getValue('offsetX', style, feature, zoom) ^ 0) - (w * .5);
        // x1 = (style['offsetX'] ^ 0) - (w * .5);
        x2 = x1 + w;


        if (x1 < minX) {
            minX = x1;
        }
        if (x2 > maxX) {
            maxX = x2;
        }


        y1 = (getValue('offsetY', style, feature, zoom) ^ 0) - (h * .5);
        // y1 = (style['offsetY'] ^ 0) - (h * .5);
        y2 = y1 + h;


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

const getMaxZLevel = (styles: StyleGroup, feature, level: number) => {
    let maxZ = 0;
    let z;

    for (let s = 0; s < styles.length; s++) {
        z = getValue('zIndex', styles[s], feature, level);

        if (z > maxZ) {
            maxZ = z;
        }
    }

    return maxZ;
};

export {getValue, getStrokeWidth, getPixelSize, merge, isStyle, getMaxZLevel, StyleGroup, Style};
