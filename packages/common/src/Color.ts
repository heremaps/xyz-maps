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

export namespace Colors {
    /**
     * @hidden
     */
    export type RGBA = [number, number, number, number?];

    /**
     * @hidden
     */
    export type Color = string | RGBA | number;

    const HTML_COLOR_NAMES: { [color: string]: RGBA | string } = {
        aliceblue: 'f0f8ff',
        antiquewhite: 'faebd7',
        aqua: '00ffff',
        aquamarine: '7fffd4',
        azure: 'f0ffff',
        beige: 'f5f5dc',
        bisque: 'ffe4c4',
        black: '000000',
        blanchedalmond: 'ffebcd',
        blue: '0000ff',
        blueviolet: '8a2be2',
        brown: 'a52a2a',
        burlywood: 'deb887',
        cadetblue: '5f9ea0',
        chartreuse: '7fff00',
        chocolate: 'd2691e',
        coral: 'ff7f50',
        cornflowerblue: '6495ed',
        cornsilk: 'fff8dc',
        crimson: 'dc143c',
        cyan: '00ffff',
        darkblue: '00008b',
        darkcyan: '008b8b',
        darkgoldenrod: 'b8860b',
        darkgray: 'a9a9a9',
        darkgrey: 'a9a9a9',
        darkgreen: '006400',
        darkkhaki: 'bdb76b',
        darkmagenta: '8b008b',
        darkolivegreen: '556b2f',
        darkorange: 'ff8c00',
        darkorchid: '9932cc',
        darkred: '8b0000',
        darksalmon: 'e9967a',
        darkseagreen: '8fbc8f',
        darkslateblue: '483d8b',
        darkslategray: '2f4f4f',
        darkslategrey: '2f4f4f',
        darkturquoise: '00ced1',
        darkviolet: '9400d3',
        deeppink: 'ff1493',
        deepskyblue: '00bfff',
        dimgray: '696969',
        dimgrey: '696969',
        dodgerblue: '1e90ff',
        firebrick: 'b22222',
        floralwhite: 'fffaf0',
        forestgreen: '228b22',
        fuchsia: 'ff00ff',
        gainsboro: 'dcdcdc',
        ghostwhite: 'f8f8ff',
        gold: 'ffd700',
        goldenrod: 'daa520',
        gray: '808080',
        grey: '808080',
        green: '008000',
        greenyellow: 'adff2f',
        honeydew: 'f0fff0',
        hotpink: 'ff69b4',
        indianred: 'cd5c5c',
        indigo: '4b0082',
        ivory: 'fffff0',
        khaki: 'f0e68c',
        lavender: 'e6e6fa',
        lavenderblush: 'fff0f5',
        lawngreen: '7cfc00',
        lemonchiffon: 'fffacd',
        lightblue: 'add8e6',
        lightcoral: 'f08080',
        lightcyan: 'e0ffff',
        lightgoldenrodyellow: 'fafad2',
        lightgray: 'd3d3d3',
        lightgrey: 'd3d3d3',
        lightgreen: '90ee90',
        lightpink: 'ffb6c1',
        lightsalmon: 'ffa07a',
        lightseagreen: '20b2aa',
        lightskyblue: '87cefa',
        lightslategray: '778899',
        lightslategrey: '778899',
        lightsteelblue: 'b0c4de',
        lightyellow: 'ffffe0',
        lime: '00ff00',
        limegreen: '32cd32',
        linen: 'faf0e6',
        magenta: 'ff00ff',
        maroon: '800000',
        mediumaquamarine: '66cdaa',
        mediumblue: '0000cd',
        mediumorchid: 'ba55d3',
        mediumpurple: '9370d8',
        mediumseagreen: '3cb371',
        mediumslateblue: '7b68ee',
        mediumspringgreen: '00fa9a',
        mediumturquoise: '48d1cc',
        mediumvioletred: 'c71585',
        midnightblue: '191970',
        mintcream: 'f5fffa',
        mistyrose: 'ffe4e1',
        moccasin: 'ffe4b5',
        navajowhite: 'ffdead',
        navy: '000080',
        oldlace: 'fdf5e6',
        olive: '808000',
        olivedrab: '6b8e23',
        orange: 'ffa500',
        orangered: 'ff4500',
        orchid: 'da70d6',
        palegoldenrod: 'eee8aa',
        palegreen: '98fb98',
        paleturquoise: 'afeeee',
        palevioletred: 'd87093',
        papayawhip: 'ffefd5',
        peachpuff: 'ffdab9',
        peru: 'cd853f',
        pink: 'ffc0cb',
        plum: 'dda0dd',
        powderblue: 'b0e0e6',
        purple: '800080',
        red: 'ff0000',
        rosybrown: 'bc8f8f',
        royalblue: '4169e1',
        saddlebrown: '8b4513',
        salmon: 'fa8072',
        sandybrown: 'f4a460',
        seagreen: '2e8b57',
        seashell: 'fff5ee',
        sienna: 'a0522d',
        silver: 'c0c0c0',
        skyblue: '87ceeb',
        slateblue: '6a5acd',
        slategray: '708090',
        slategrey: '708090',
        snow: 'fffafa',
        springgreen: '00ff7f',
        steelblue: '4682b4',
        tan: 'd2b48c',
        teal: '008080',
        thistle: 'd8bfd8',
        tomato: 'ff6347',
        turquoise: '40e0d0',
        violet: 'ee82ee',
        wheat: 'f5deb3',
        white: 'ffffff',
        whitesmoke: 'f5f5f5',
        yellow: 'ffff00',
        yellowgreen: '9acd32'
    };

    const hexStringToRGBA = (hexString: string): RGBA => {
        const length = hexString.length;
        if (length < 5) {
            return [
                parseInt(hexString.charAt(0), 16) / 15,
                parseInt(hexString.charAt(1), 16) / 15,
                parseInt(hexString.charAt(2), 16) / 15,
                length == 4
                    ? parseInt(hexString.charAt(3), 16) / 15
                    : 1
            ];
        } else {
            return hexToRGBA(parseInt(hexString, 16), length == 8);
        }
    };

    const hexToRGBA = (hex: number, alpha?: boolean): RGBA => {
        return alpha ? [
            (hex >> 24 & 255) / 255,
            (hex >> 16 & 255) / 255,
            (hex >> 8 & 255) / 255,
            (hex & 255) / 255
        ] : [
            (hex >> 16 & 255) / 255,
            (hex >> 8 & 255) / 255,
            (hex & 255) / 255,
            1
        ];
    };

    for (let name in HTML_COLOR_NAMES) {
        HTML_COLOR_NAMES[name] = hexStringToRGBA(HTML_COLOR_NAMES[name] as string);
    }

    const parseRGBAString = (color: string): RGBA => {
        const rgb = <number[]><unknown>color.match(/^rgba?\s*\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*(?:\.\d+)?))?\)$/);

        return rgb?.length > 3 && [
            rgb[1] / 255,
            rgb[2] / 255,
            rgb[3] / 255,
            rgb[4] == undefined ? 1 : Number(rgb[4])
        ];
    };

    /**
     * @hidden
     */
    export const toRGB = (color: Color, ignoreNumbers?: boolean): RGBA => {
        let rgba;
        if (color) {
            if (Array.isArray(color)) {
                rgba = color;
                if (rgba.length == 3) {
                    rgba[3] = 1;
                }
            } else if (typeof color == 'number') {
                if (!ignoreNumbers) {
                    rgba = hexToRGBA(color);
                }
            } else if (color[0] == '#') {
                rgba = hexStringToRGBA(color.slice(1));
            } else {
                if (/^([A-Fa-f\d]+)$/.test(color)) {
                    rgba = hexStringToRGBA(color);
                } else if (color.startsWith('rgb')) {
                    rgba = parseRGBAString(color);
                } else {
                    rgba = HTML_COLOR_NAMES[color];
                    rgba = (rgba as RGBA) && [rgba[0], rgba[1], rgba[2], rgba[3]];
                }
            }
        }
        return rgba || null;
    };

    export const rgbaToHexString = (rgba: [number, number, number, number?]): string => {
        const [r, g, b, a = 1] = rgba;
        const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
        const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        return a < 1 ? `${hex}${toHex(a)}` : hex;
    };

}
