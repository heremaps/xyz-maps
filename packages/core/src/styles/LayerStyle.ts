/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
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

import {Feature} from '../features/Feature';
import {Style} from './GenericStyle';


/**
 * A StyleValueFunction is a function that returns the desired value for the respective style property.
 * It's especially useful for data driven styling.
 *
 * @param feature - the feature for which the style is to be obtained
 * @param zoom - the zoomlevel of the style
 *
 * @example
 * ```typescript
 * text: (feature, zoom) => feature.properties.name
 * ```
 */
export type StyleValueFunction<Type> = (feature: Feature, zoom: number) => Type | undefined;

/**
 * A StyleZoomRange is a Map\<number,any\> with zoomlevel as its keys and the value for the respective {@link Style | Style Property} at the respective zoomlevel.
 * Values for intermediate zoom levels are interpolated linearly.
 *
 * @example
 * ```typescript
 * strokeWidth: {
 *     // 2px for zoomlevel 1 to 12
 *     13: 2,  // 2px at zoomlevel 13
 *     // 10px for zoomlevel 14 (linear interpolation)
 *     15: 18, // 18px at zoomlevel 15
 *     // 27px for zoomlevel 16 (linear interpolation)
 *     17: 36  // 36px at zoomlevel 20
 *     // 36px for zoomlevels 18 to 20
 * }
 * ```
 */
export type StyleZoomRange<Type> = { [zoom: number]: Type }

export {Style};
// /**
//  * The Style defines how certain features should be rendered.
//  */
// export type Style = GenericStyle
//     | LineStyle
//     | PolygonStyle
//     | VerticalLineStyle
//     | TextStyle
//     | RectStyle
//     | CircleStyle
//     | ImageStyle
//     | BoxStyle
//     | SphereStyle
//     | ModelStyle;

export type StyleGroupMap = { [id: string]: StyleGroup }

export type StyleGroup = Array<Style>;


// (<LineStyle>testStyle[0]).stroke;

/**
 * The Color is an RGBA color value representing RED, GREEN, and BLUE light sources with an optional alpha channel.
 * Colors can be specified in the following ways:
 * - CSS color names: "red"
 * - RGB colors: "rgb(255,0,0)"
 * - RGBA colors: "rgba(255,0,0,1.0)"
 * - Hexadecimal colors: "#ff0000" | "#f00"
 * - Hexadecimal colors with transparency: "#ff0000ff"
 * - hexadecimal numbers: 0xff0000
 * - RGBA Color Array: [1.0, 0.0, 0.0, 1.0]
 */
export type Color = string | number | [number, number, number, number];

/**
 * This is an interface to describe how certain features should be rendered within a layer.
 * @example
 * ```typescript
 * {
 *  styleGroups: {
 *    "myLineStyle": [
 *      {zIndex: 0, type: "Line", opacity: 1, stroke: "#BE6B65", strokeWidth: 16},
 *      {zIndex: 1, type: "Line", opacity: 1, stroke: "#E6A08C", strokeWidth: 12},
 *      {zIndex: 2, type: "Text", fill: "#000000", "textRef": "properties.name"}
 *    ]
 *  },
 *  assign: function(feature: Feature, zoomlevel: number){
 *    return "myLineStyle";
 *  }
 * }
 * ```
 */
export interface LayerStyle {

    /**
     * @deprecated define strokeWidth style property using a "StyleZoomRange" value instead.
     * @hidden
     */
    strokeWidthZoomScale?: (level: number) => number;

    /**
     * the color for the background of the layer
     */
    backgroundColor?: Color | StyleZoomRange<Color> | ((zoomlevel: number) => Color);

    /**
     *  This object contains key/styleGroup pairs.
     *  A styleGroup is an array of {@link Style}, that exactly defines how a feature should be rendered.
     */
    styleGroups: { [key: string]: Array<Style> };

    /**
     *  The function returns a key that is defined in the styleGroups map.
     *  This function will be called for each feature being rendered by the display.
     *  The display expects this method to return the key for the styleGroup of how the feature should be rendered for the respective zoomlevel.
     *
     *  @param feature - the feature to which style is applied
     *  @param zoomlevel - the zoomlevel of the tile the feature should be rendered in
     *
     *  @returns the key/identifier of the styleGroup in the styleGroupMap, or null/undefined if the feature should not be rendered.
     */
    assign: (feature: Feature, zoomlevel: number) => string | null | undefined;
}
