/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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

type styleStringFunction = (feature: Feature, zoom: number) => string | null | undefined;
type styleNumberFunction = (feature: Feature, zoom: number) => number | null | undefined;
type styleBooleanFunction = (feature: Feature, zoom: number) => boolean | null | undefined;
type styleNumberArrayFunction = (feature: Feature, zoom: number) => number[] | null | undefined;

/**
 * Style object represents supported style attributes of Features. It indicates how a symbolizer in feature should be rendered.
 *
 * A style object should always include "zIndex" and "type" attributes, and each type of symbolizer should include its own type-specific attributes:
 * - Circle: "radius" must be included and either "fill" or "stroke" should be included.
 * - Rect: "width" must be included and "height" will be set with the same value as "width" if only "width" is present. Either "fill" or "stroke" should be included
 * - Text: "text" or "textRef" should be included and "fill" or "stroke" should also be included for text color
 * - Image: "src" and "width" must be included. "height" will be set with the same value as "width" if only "width" is present.
 * - Line: "stroke" must be included.
 * - Polygon: "fill" or "stroke" must be included.
 *
 * @example
 * ```
 * // example of Circle:
 * {zIndex:0, type:"Circle", radius:16, fill:"#FFFF00"}
 *
 * // example of Rect:
 * {zIndex:0, type:"Rect", fill:"#4C9EEF", stroke:"#0156BB", width:20, height:20}
 *
 * // example of Text:
 * {zIndex:1, type:"Text", fill:"#FFFFFF", text:"HERE", font:"normal 12px Arial"}
 *
 * // example of Image:
 * {zIndex:0, type:"Image", src:"./here.png", width:20, height:20}
 *
 * // example of Line:
 * {zIndex:0, type:"Line", opacity:0.5, stroke:"#BE6B65", strokeLinecap:"round", strokeLinejoin:"round", strokeWidth:16}
 *
 * // example of Polygon:
 * {zIndex:0, type:"Polygon", opacity:0.5, stroke:"#BE6B65", fill:"#FFFFFF"}
 * ```
 */
export interface Style {
    /**
     * Indicates type of the shape to render.
     * Its value must be one of the following: "Circle", "Rect", "Text", "Image", "Line" or "Polygon".
     */
    type: 'Circle' | 'Rect' | 'Image' | 'Text' | 'Line' | 'Polygon';
    /**
     * Indicates the drawing order within a layer.
     * Styles with larger zIndex value are rendered above those with smaller values.
     * The zIndex is defined relative to the "zLayer" property.
     * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
     */
    zIndex: number | styleNumberFunction;
    /**
     * Indicates drawing order across multiple layers.
     * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
     * If no zLayer is defined the zLayer depends on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example {...zLayer:2, zIndex:5} will be rendered on top of {...zLayer:1, zIndex:10}
     */
    zLayer?: number | styleNumberFunction;
    /**
     * Specifies the URL of an image.
     * It can be either absolute or relative path.
     * It is only required by "Image".
     */
    src?: string | styleStringFunction;
    /**
     * Sets the color to fill the shape.
     * This attribute is valid for Circle, Rect, Text and Polygon.
     */
    fill?: string | styleStringFunction;
    /**
     * Sets the stroke color of the shape.
     * This attribute is valid for Circle, Rect, Line, Text and Polygon.
     */
    stroke?: string | styleStringFunction;
    /**
     * Sets the width of thw stroke.
     * This attribute is valid for Circle, Rect, Line, Text and Polygon.
     */
    strokeWidth?: number | styleNumberFunction;
    /**
     * This controls the shape of the ends of lines. there are three possible values for strokeLinecap:
     * - "butt" closes the line off with a straight edge that's normal (at 90 degrees) to the direction of the stroke and crosses its end.
     * - "square" has essentially the same appearance, but stretches the stroke slightly beyond the actual path. The distance that the stroke goes beyond the path is half the strokeWidth.
     * - "round" produces a rounded effect on the end of the stroke. The radius of this curve is also controlled by the strokeWidth.
     * This attribute is valid for Line styles only.
     */
    strokeLinecap?: string | styleStringFunction;
    /**
     * The joint where the two segments in a line meet is controlled by the strokeLinejoin attribute, There are three possible values for this attribute:
     * - "miter" extends the line slightly beyond its normal width to create a square corner where only one angle is used.
     * - "round" creates a rounded line segment.
     * - "bevel" creates a new angle to aid in the transition between the two segments.
     * This attribute is valid for Line styles only.
     */
    strokeLinejoin?: string | styleStringFunction;
    /**
     * The strokeDasharray attribute controls the pattern of dashes and gaps used to stroke paths.
     * It's an array of <length> that specify the lengths of alternating dashes and gaps. If an odd number of values is provided,
     * then the list of values is repeated to yield an even number of values. Thus, 5,3,2 is equivalent to 5,3,2,5,3,2.
     * This attribute is valid for Line styles only.
     */
    strokeDasharray?: number[] | styleNumberArrayFunction,
    /**
     * Opacity of the style.
     * It is valid for all style types.
     */
    opacity?: number | styleNumberFunction;
    /**
     *  Radius of the Circle in pixel.
     *  It is only required by Circle.
     */
    radius?: string | styleNumberFunction;
    /**
     * Width of the style in pixels.
     * It is only required by Rect and Image.
     * The maximum support width for "Image" is 64 pixels.
     */
    width?: number | styleNumberFunction;
    /**
     * Height of the style in pixels.
     * It is only required by Rect and Image.
     * The maximum support height for "Image" is 64 pixels.
     */
    height?: number | styleNumberFunction;
    /**
     * CSS font string for texts.
     * It is only valid for Text.
     *
     * @default “normal 12px Arial”
     */
    font?: string | styleStringFunction;

    /**
     * Text is either a string or a function that generates the string that should be displayed.
     * It is valid for Text style only.
     *
     * @example
     * ```
     * // display the name property of a feature in uppercase
     * ...
     * text: function(feature){
     *   return feature.properties.name.toUpperCase();
     * }
     * ```
     */
    text?: string | number | boolean | styleStringFunction | styleNumberFunction;
    /**
     * "textRef" Reference to an attribute of an feature that's value should be displayed as text.
     * If both "text" and "textRef" are set, "text" prevails.
     * It is only required by Text.
     * @example
     * ```
     * // display the property "name" of the feature's properties
     * ...
     * textRef: "properties.name"
     * ```
     * @example
     * ```
     * // display the id of the featurre
     * ...
     * textRef: "id"
     * ```
     */
    textRef?: string | styleStringFunction;
    /**
     * Define the starting position of a segment of the entire line in %.
     * A Segment allows to display and style parts of the entire line individually.
     * The value must be between 0 and 1.
     * The Default is 0.
     * Applies to Line style only.
     *
     * @example
     * from: 0.0 // -> 0%, the segment has the same starting point as the entire line
     * from:  0.5 // -> 50%, the segment starts in the middle of the entire line
     */
    from?: number | styleNumberFunction;

    /**
     * Define the end position of a segment of the entire line in %.
     * A Segment allows to display and style parts of the entire line individually.
     * The value must be between 0 and 1.
     * The Default is 1.
     * Applies to Line style only.
     *
     * @example
     * to: 0.5 // -> 50%, the segment ends in the middle of the entire line
     * to: 1.0 // -> 100%, the segment has the same end point as the entire line
     */
    to?: number | styleNumberFunction;

    /**
     *  Offset the shape in pixels on x-axis.
     *  It is valid for Circle, Rect, Text and Image.
     */
    offsetX?: number | styleNumberFunction;
    /**
     *  Offset the shape in pixels on y-axis.
     *  It is valid for Circle, Rect, Text and Image.
     */
    offsetY?: number | styleNumberFunction;
    /**
     * Offset a line to the left or right side in pixel.
     * A positive values offsets to the right side, a negative value offsets to the left.
     * The side is defined relative to the direction of the line geometry.
     * Applies to Line style only.
     */
    offset?: number | styleNumberFunction;
    /**
     * Alignment for Text. Possible values are: "map" and "viewport".
     * "map" aligns to the plane of the map and "viewport" aligns to the plane of the viewport/screen.
     * Default alignment for Text based on point geometries is "viewport" while "map" is the default for line geometries.
     */
    alignment?: 'map' | 'viewport' | styleStringFunction;
    /**
     * Rotate the shape of the style to the angle in degrees.
     * This attribute is validate for Rect and Image.
     */
    rotation?: number | styleNumberFunction;
    /**
     * In case of label collision, Text with a higher priority (lower value) will be drawn before lower priorities (higher value).
     * "priority" applies to Text only.
     */
    priority?: number | styleNumberFunction;
    /**
     * Minimum distance in pixels between repeated text labels on line geometries.
     * Applies per tile only.

     * @default 256 (pixels)
     */
    repeat?: number | styleNumberFunction;
    /**
     * Enable oder Disable line wrapping for labels based on "Point" geometries.
     * Works for "Text" only.
     *
     * - number: Maximum number of characters per line [Default 14 characters]
     * - false: disable line wrapping
     * - true: enable line wrapping [Default 14 characters]
     *
     * @default 14
     */
    lineWrap?: number | styleNumberFunction;

    /**
     * Enable or disable collision detection.
     * Works for "Text" only.
     * true - collision are allowed, Collision detection is disabled.
     * false - avoid collisions, Collision detection is enabled. [default]
     *
     * @default false
     */
    collide?: boolean | styleBooleanFunction;
}

export type StyleGroupMap = { [id: string]: StyleGroup }

export type StyleGroup = Array<Style>;


/**
 * This is an interface to describe how certain features should be rendered within a layer.
 * @example
 * ```
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
     *  This object contains key/styleGroup pairs.
     *  A styleGroup is an array of {@link Style}, that exactly defines how a feature should be rendered.
     */
    styleGroups: StyleGroupMap;
    /**
     *  The function returns a key that is defined in the styleGroups map.
     *  This function will be called for each feature being rendered by the display.
     *  The display expects this method to return the key for the styleGroup of how the feature should be rendered for the respective zoomlevel.
     *
     *  @param feature - the feature to which style is applied
     *  @param zoomlevel - the zoomlevel of the tile the feature should be rendered in
     *
     *  @returns the key/identifier of the styleGroup in the styleGroupMap
     */
    assign: (feature: Feature, zoomlevel: number) => string;
};
