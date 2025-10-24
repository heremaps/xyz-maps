/*
 * Copyright (C) 2019-2023 HERE Europe B.V.
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
import {
    AmbientLight,
    DirectionalLight,
    Color,
    StyleExpression,
    StyleValueFunction,
    StyleZoomRange
} from './LayerStyle';
import {LinearGradient} from './HeatmapStyle';

/**
 * The Style object defines how certain features should be rendered.
 * A style object must always contain the attributes "zIndex" and "type" as well as the mandatory attributes of the corresponding "type":
 * - Circle: "radius" must be included and either "fill" or "stroke" should be included.
 * - Rect: "width" must be included and "height" will be set with the same value as "width" if only "width" is present. Either "fill" or "stroke" should be included
 * - Text: "text" or "textRef" should be included and "fill" or "stroke" should also be included for text color
 * - Image: "src" and "width" must be included. "height" will be set with the same value as "width" if only "width" is present.
 * - Line: "stroke" must be included.
 * - Polygon: "fill" or "stroke" must be included.
 * - Box: "width" must be included, while "height" and "depth" will be set with the same value as "width" if only "width" is present. Either "fill" or "stroke" should be included
 * - Sphere: A style of type Sphere must include "radius" and "fill".
 * - VerticalLine: "stroke" must be included.
 *
 * @example
 * ```typescript
 * // example of Circle:
 * {zIndex: 0, type: "Circle", radius: 16, fill: "#FFFF00"}
 *
 * // example of Rect:
 * {zIndex: 0, type: "Rect", fill: "#4C9EEF", stroke: "#0156BB", width: 20, height: 20}
 *
 * // example of Text:
 * {zIndex:1, type: "Text", fill: "#FFFFFF", text: "HERE", font: "normal 12px Arial"}
 *
 * // example of Image:
 * {zIndex: 0, type: "Image", src: "./xyz.png", width: 20, height: 20}
 *
 * // example of Line:
 * {zIndex: 0, type: "Line", opacity: 0.5, stroke: "#BE6B65", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 16}
 *
 * // example of Polygon:
 * {zIndex: 0, type: "Polygon", opacity: 0.5, stroke: "#BE6B65", fill: "#FFFFFF"}
 *
 * // example of Box:
 * {zIndex: 0, type: "Box", width: 16, height: 16, depth: 16, stroke: "#BE6B65", fill: "#FFFFFF"}
 *
 * // example of Sphere:
 * {zIndex: 0, type: "Sphere", radius: 16, fill: "#FFFFFF"}
 * ```
 */
export interface Style {
    /**
     * Indicates type of the shape to render.
     * Its value must be one of the following: "Circle", "Rect", "Text", "Image", "Line", "Polygon", "VerticalLine", "Box" or "Sphere",
     */
    type: 'Circle' | 'Rect' | 'Image' | 'Text' | 'Line' | 'Polygon' | 'VerticalLine' | 'Box' | 'Sphere' | string;

    /**
     * Indicates the drawing order within a layer.
     * Styles with larger zIndex value are rendered above those with smaller values.
     * The zIndex is defined relative to the "zLayer" property.
     * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
     */
    zIndex: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * Indicates drawing order across multiple layers.
     * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
     * If no zLayer is defined, it will fall back to the {@link LayerStyle.zLayer} or depend on the display layer order.
     * If no zLayer is defined, it will fall back to the {@link LayerStyle.zLayer} or depend on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number> | StyleExpression<number>;

    /**
     * Specifies the URL of an image.
     * It can be either absolute or relative path.
     * It is only required by "Image".
     */
    src?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;

    /**
     * Sets the color to fill the shape.
     * This attribute is valid for Circle, Rect, Text and Polygon.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    fill?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | LinearGradient | StyleExpression<Color>;

    /**
     * Sets the stroke color of the shape.
     * This attribute is valid for Circle, Rect, Line, Text and Polygon.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    stroke?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Sets the width of the stroke.
     * This attribute is valid for Circle, Rect, Line, Text and Polygon.
     * The unit of strokeWidth is defined in pixels.
     * For Polygons that are using {@link extrude}, the maximum possible strokeWidth is 1.0 pixel.
     * For Styles of type Line the strokeWidth can also be defined in meters by using a string: "$\{width\}m".
     *
     * @example
     * ```typescript
     * // define a Line that has a with of 1 meter
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     stroke: "blue",
     *     strokeWidth: "1m"
     * }
     * // define a Line that has a with of 16 pixel
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     stroke: "green",
     *     strokeWidth: "16
     * }
     * ```
     * @example
     * ```typescript
     * // define a Text style with a strokeWidth of 8px
     * {
     *     zIndex: 0,
     *     type: "Text",
     *     text: "doc",
     *     fill: "white",
     *     stroke: "black,
     *     strokeWidth: 8
     * }
     * ```
     */
    strokeWidth?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;

    /**
     * This controls the shape of the ends of lines. there are three possible values for strokeLinecap:
     * - "butt" closes the line off with a straight edge that's normal (at 90 degrees) to the direction of the stroke and crosses its end.
     * - "square" has essentially the same appearance, but stretches the stroke slightly beyond the actual path. The distance that the stroke goes beyond the path is half the strokeWidth.
     * - "round" produces a rounded effect on the end of the stroke. The radius of this curve is also controlled by the strokeWidth.
     * This attribute is valid for Line styles only.
     *
     * If "strokeLinecap" is used in combination with "altitude", only "butt" is supported for "strokeLinecap".
     */
    strokeLinecap?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;

    /**
     * The joint where the two segments in a line meet is controlled by the strokeLinejoin attribute, There are three possible values for this attribute:
     * - "miter" extends the line slightly beyond its normal width to create a square corner where only one angle is used.
     * - "round" creates a rounded line segment.
     * - "bevel" creates a new angle to aid in the transition between the two segments.
     * This attribute is valid for Line styles only.
     *
     * If "strokeLinejoin" is used in combination with "altitude", the use of "round" is not supported.
     */
    strokeLinejoin?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;

    /**
     * The strokeDasharray attribute controls the pattern of dashes and gaps used to stroke paths.
     * It's an array of <length> that specify the lengths of alternating dashes and gaps. If an odd number of values is provided,
     * then the list of values is repeated to yield an even number of values. Thus, 5,3,2 is equivalent to 5,3,2,5,3,2.
     * The size of dashes and gaps can be defined in pixel or meter.
     * The default unit for dash and gap size is pixel.
     * In a pattern utilizing both meter and pixel units, only the initial "dash" and "gap" combination is utilized, with the subsequent ones being skipped.
     * To define the size in meters, a string containing the "dash"/"gap" size and ending with "m" must be used.
     * This attribute is valid for Line and Polygon styles only.
     *
     * @example
     * // dash and gap size is defined in pixel.
     * strokeDasharray: [20,10]
     * // dash and gap size is defined in meter.
     * strokeDasharray: ["20m","10m"]
     * // dash -> 10 meter, gap -> 10 pixel.
     * strokeDasharray: ["20m",10] || ["20m","10px"]
     */
    strokeDasharray?: (number | string)[] | StyleValueFunction<(number | string)[]> | StyleZoomRange<(number | string)[]> | StyleExpression<(number | string)[]> | 'none';

    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     * It is valid for all style types.
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * The Radius of the Circle and Sphere.
     * It is required by styles of type "Circle" and "Sphere".
     * The default unit is pixels.
     * To define the radius of a Circle in meters a string can be used: "$\{width\}m".
     * The radius of "Sphere" must be defined in pixels.
     *
     * @example
     * ```typescript
     * // define a Sphere with a radius of 32 pixel.
     * {
     *     zIndex: 0,
     *     type: "Sphere",
     *     fill: "red",
     *     radius: 32
     * }
     * ```
     * @example
     * ```typescript
     * // define a Circle with a radius of 1 meter
     * {
     *     zIndex: 0,
     *     type: "Circle",
     *     fill: "red",
     *     radius: "1m"
     * }
     * // define a Circle with a radius of 16 pixel
     * {
     *     zIndex: 0,
     *     type: "Circle",
     *     fill: "red",
     *     radius: 16
     * }
     * ```
     */
    radius?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;

    /**
     * Width of the style in pixels.
     * It is only required by Rect, Image and Box.
     * The maximum supported width for "Image" is 64 pixels.
     * The unit of width is defined in pixels.
     * For styles of type "Rect" the width can also be defined in meters by using a string: "$\{width\}m".
     * @example
     * ```typescript
     * // define a Rect that has a width (and height) of 2.2 meter
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     stroke: "blue",
     *     width: "2.2m"
     * }
     * ```
     * @example
     * ```typescript
     * // define a Rect that has a width (and height) of 16 pixel
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     stroke: "green",
     *     width: 16
     * }
     * ```
     */
    width?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * Height of the style in pixels.
     * It is only required by Rect and Image.
     * The maximum supported height for "Image" is 64 pixels.
     * The unit of height is defined in pixels.
     * For styles of type "Rect" the height can also be defined in meters by using a string: "$\{width\}m".
     * @example
     * ```typescript
     * // define a Rect that has a width of 2 meter and a height of 1 meter.
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     stroke: "blue",
     *     width: "2m",
     *     height: "1m"
     * }
     * ```
     * @example
     * ```typescript
     * // define a Rect that has a width of 20 pixel and a height of 28 pixel.
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     stroke: "green",
     *     width: 20,
     *     height: 28
     * }
     * ```
     * @example
     * ```typescript
     * // define a Image/Icon style with/height of 32pixel
     * {
     *     zIndex: 0,
     *     type: "Image",
     *     src: "urlToMyImageResource",
     *     width: 32
     * }
     * ```
     */
    height?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * The depth of the style in pixels.
     * The depth defines the length of the edges of a "Box" parallel to the Z axis.
     * The unit of depth is defined in pixels and only required by styles of type "Box".
     * @example
     * ```typescript
     * // define a Box that has a width, height and depth of 16px
     * {
     *     zIndex: 0,
     *     type: "Box",
     *     stroke: "blue",
     *     fill: "red",
     *     width: 16,
     *     height: 16,
     *     depth: 16
     * }
     * ```
     */
    depth?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * CSS font string for texts.
     * It is only valid for Text.
     *
     * @defaultValue “normal 12px Arial”
     */
    font?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;

    /**
     * Text is either a string or a function that generates the string that should be displayed.
     * It is valid for Text style only.
     *
     * @example
     * ```typescript
     * // display the name property of a feature in uppercase
     * ...
     * text: function(feature){
     *   return feature.properties.name.toUpperCase();
     * }
     * ```
     */
    text?: string | number | boolean | StyleValueFunction<string | number | boolean> | StyleZoomRange<string | number | boolean> | StyleExpression<string | number | boolean>;

    /**
     * "textRef" Reference to an attribute of an feature that's value should be displayed as text.
     * If both "text" and "textRef" are set, "text" prevails.
     * It is only required by Text.
     * @example
     * ```typescript
     * // display the property "name" of the feature's properties
     * ...
     * textRef: "properties.name"
     * ```
     * @example
     * ```typescript
     * // display the id of the featurre
     * ...
     * textRef: "id"
     * ```
     */
    textRef?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;

    /**
     * Define the starting position of a segment of the entire line in %.
     * A Segment allows to display and style parts of the entire line individually.
     * The value must be between 0 and 1.
     * The Default is 0.
     *
     * @example
     * from: 0.0 // -\> 0%, the segment has the same starting point as the entire line
     * from:  0.5 // -\> 50%, the segment starts in the middle of the entire line
     */
    from?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * Define the end position of a segment of the entire line in %.
     * A Segment allows to display and style parts of the entire line individually.
     * The value must be between 0 and 1.
     * The Default is 1.
     *
     * @example
     * to: 0.5 // -\> 50%, the segment ends in the middle of the entire line
     * to: 1.0 // -\> 100%, the segment has the same end point as the entire line
     */
    to?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * Offset the shape in pixels on x-axis.
     * It is valid for Circle, Rect, Text, Image, Box and Sphere.
     * A positive value offsets to the right, a negative value to the left.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Image by 8px to the right.
     * { type: "Image", zIndex: 0, src: '...', offsetX: 8}
     *
     * // offset Circle by 1m to the left
     * { type: "Circle", zIndex: 0, fill:'blue', radius: 4, offsetX: "-1m"}
     * ```
     */
    offsetX?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;

    /**
     * Offset the shape in pixels on y-axis.
     * It is valid for Circle, Rect, Text, Image, Box and Sphere.
     * A positive value offsetY offsets downwards, a negative value upwards.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Image by 8px to the bottom
     * { type: "Image", zIndex: 0, src: '...', offsetY: 8}
     *
     * // offset Circle by 1m to the top
     * { type: "Circle", zIndex: 0, fill:'blue', radius: 4, offsetY: "-1m"}
     * ```
     */
    offsetY?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<string>;

    /**
     * Offset the shape in pixels on z-axis.
     * It is valid for Circle, Rect, Text, Image, Box and Sphere.
     * A positive value offsets up, a negative value down.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Image by 8px to the top.
     * { type: "Image", zIndex: 0, src: '...', offsetZ: 8}
     *
     * // offset Circle by 1m to the top
     * { type: "Circle", zIndex: 0, fill:'blue', radius: 4, offsetZ: "1m"}
     * ```
     */
    offsetZ?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;

    /**
     * Offset a line to the left or right side in pixel or meter.
     * A positive values offsets to the right side, a negative value offsets to the left.
     * The side is defined relative to the direction of the line geometry.
     * The default unit is pixels.
     * To define the offset in meters a string that contains the offset value and ends with "m" must be used.
     * Applies to Line style only.
     * @example
     * ```typescript
     * // offset line by 8px
     * { type: "Line", zIndex: 0, stroke:'blue', strokeWidth: 4, offset: 8}
     *
     * // offset line by 2m
     * { type: "Line", zIndex: 0, stroke:'blue', strokeWidth: 4, offset: "2m"}
     * ```
     */
    offset?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;

    /**
     * Alignment for styles of type "Circle", "Rect", "Image" and "Text".
     * Possible values are: "map" and "viewport".
     * "map" aligns to the plane of the map and "viewport" aligns to the plane of the viewport/screen.
     * Default alignment for Text based on point geometries is "viewport" while "map" is the default for line geometries.
     */
    alignment?: 'map' | 'viewport' | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;

    /**
     * Rotate the shape of the style to the angle in degrees.
     * This attribute is validate for Rect and Image.
     */
    rotation?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * In case of label collision, Text with a higher priority (lower value) will be drawn before lower priorities (higher value).
     * If the collision detection is enabled for multiple Styles within the same StyleGroup, the highest priority (lowest value)
     * is used.
     */
    priority?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * Minimum distance in pixels between repeated style-groups on line geometries.
     * Applies per tile only.
     *
     * @defaultValue 256 (pixels)
     */
    repeat?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * Enable oder Disable line wrapping for styles of type "Text".
     * The line wrapping for text on (Multi)Linestring geometry with anchor set to "Line" is disabled by default,
     * otherwise it's 14 characters.
     *
     * - number: Maximum number of characters per line [Default 14 characters]
     * - false: disable line wrapping
     * - true: enable line wrapping [Default 14 characters]
     *
     * @defaultValue 14
     */
    lineWrap?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * Sets the anchor point for styles of type "Circle", "Rect", "Image" and "Text" used with Line or Polygon geometry.
     *
     * Possible values for Line geometry are "Coordinate" and "Line".
     * - "Coordinate": the respective style is displayed at each coordinate of the polyline.
     * - "Line": the respective style is displayed on the shape of the polyline when there is enough space. See {@link checkLineSpace} to disable the space check.
     *
     * Possible values for Polygon geometry are "Center" and "Centroid".
     * - "Center": the center of the bounding box of the polygon.
     * - "Centroid": the geometric centroid of the polygon geometry.
     *
     * @defaultValue For Polygon geometry the default is "Center". For Line geometry the default for styles of type "Text" is "Line", while "Coordinate" is the default for styles of type "Circle", "Rect" or "Image".
     */
    anchor?: 'Line' | 'Coordinate' | 'Centroid' | 'Center' | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;

    /**
     * Enable or disable the space check for point styles on line geometries.
     * Only applies to "Circle", "Rect", "Image" and "Text" styles with {@link anchor} set to "Line".
     * If check checkLineSpace is enabled the respective style is only displayed if there is enough space on the line,
     * otherwise it is not displayed.
     *
     * @defaultValue true
     */
    checkLineSpace?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;

    /**
     * Enable or disable collision detection.
     * Works for styles of type "Circle", "Rect", "Image" and "Text".
     * If the collision detection is enabled for multiple Styles within the same StyleGroup, the respective Styles are
     * handled as a single Object ("CollisionGroup") where the combined bounding-box is determined automatically.
     *
     * - true: collision are allowed, Collision detection is disabled.
     * - false: avoid collisions, Collision detection is enabled.
     *
     * @defaultValue false for "Text", true for all other.
     */
    collide?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;

    /**
     * Enables collision detection and combines all styles of a StyleGroup with the same "CollisionGroup" into a single logical object for collision detection.
     */
    collisionGroup?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;

    /**
     * Extrude a Polygon or MultiPolygon geometry in meters.
     * This attribute is validate for styles of type "Polygon" only.
     */
    extrude?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * The base of the Extrude in meters.
     * The extrudeBase is defined from the ground to the bottom of the extruded Polygon in meters.
     * The extrudeBase must be less or equal then {@link extrude}.
     * This attribute applies only to styles of type "Polygon".
     *
     * @defaultValue 0
     */
    extrudeBase?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * Altitude of the Feature center in meters.
     *
     * Describes the vertical distance from the global ground plane (0m) to the Feature.
     *
     * Supported values:
     * - false (default): place at 0m.
     * - true: use the altitude (z) from the feature geometry if present, else 0. Not re-aligned to the rendered terrain.
     *         If the geometry altitude source differs from the TerrainTileLayer source/resolution, the Feature can appear
     *         slightly above or below the visible terrain surface.
     * - number: fixed absolute altitude in meters. Also not adjusted when terrain tiles load; may not perfectly sit
     *           on the terrain unless both use exactly the same elevation source, datum and resolution.
     * - 'terrain': sample (clamp to) the current terrain surface height. While the terrain tile is not yet loaded
     *              (or no terrain layer exists) the altitude is 0 and updates once data becomes available.
     *
     * Notes:
     * - 'terrain' is supported for point styles only: "Circle", "Rect", "Image", "Text", "Box", "Sphere".
     * - Use 'terrain' to keep the Feature visually seated on the rendered terrain.
     * - Use a numeric value for a constant absolute elevation independent of terrain updates.
     * - To position something N meters above terrain: use 'terrain' plus offsetZ (e.g. offsetZ: '5m').
     * - Expect mismatches (floating / sinking) when using true or a fixed number with a different terrain data source.
     *
     *
     * @defaultValue false
     * @experimental
     */
    altitude?: number | boolean | 'terrain' | StyleValueFunction<number | boolean | 'terrain'> | StyleZoomRange<number | boolean | 'terrain'> | StyleExpression<number | boolean | 'terrain'>;


    /**
     * Scales the size of a style based on the feature's altitude.
     * If it's enabled (true), features closer to the camera will be drawn larger than those farther away.
     * When off (false), the size of the style is always the same size, regardless of its actual altitude, as if it were placed on the ground (altitude 0).
     * This attribute applies to styles of type "Rect", "Image", "Text", "Circle", "Line", "Box", or "Sphere" whose size ({@link width}, {@link radius}, {@link strokeWidth}) that are using "map" {@link alignment} only.
     * If the size attribute is defined in meters, scaleByAltitude is enabled by default, for pixels it is disabled.
     *
     * @defaultValue false (pixels), true (meters)
     *
     * @experimental
     */
    scaleByAltitude?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;

    /**
     * Sets the condition(s) to determine whether a feature should be rendered with the respective style.
     * The `filter` expression is evaluated to determine if the respective style should be applied to a feature.
     * It must resolve to a boolean value where `true` means the style applies and `false` means it does not.
     *
     * This property is only used when {@link LayerStyle.assign} is not defined; otherwise, `filter` is ignored.
     *
     * @example
     * // Render features where the "type" property is equal to "park"
     * filter: ['==', ['get', 'type'], 'park']
     *
     * @example
     * // Render features where the "population" property is greater than 1000
     * filter: ['>', ['get', 'population'], 1000]
     *
     * @example
     * // Render features where the "type" property is "park" and "population" is less than 500
     * filter: ['all', ['==', ['get', 'type'], 'park'], ['<', ['get', 'population'], 500]]
     *
     * @example
     * // Render features where the "type" property is not "residential"
     * filter: ['!=', ['get', 'type'], 'residential']
     *
     * @example
     * // Render features where the "type" property is either "park" or "garden"
     * filter: ['any', ['==', ['get', 'type'], 'park'], ['==', ['get', 'type'], 'garden']]
     */
    filter?: StyleValueFunction<boolean> | StyleExpression<boolean>;

    /**
     * Specifies the name of the light group to use for illuminating specific features on a layer.
     * This property must reference a key corresponding to a light group defined in {@link LayerStyle.lights}.
     * A light group consists of lighting sources such as ambient or directional lights that affect the appearance of features.
     *
     * If `light` is not defined, the default light group `"defaultLight"` will be used to illuminate the layer's features.
     *
     * @see {@link LayerStyle.lights} for defining and referencing available light groups.
     *
     * @defaultValue "defaultLight"
     */
    light?: string;

    /**
     * Sets the emissive color of the feature, giving it a glow effect.
     *
     * This property is only applicable for Styles of type `"Polygon"`, `"Box"`, `"Sphere"` or `"Model"`;
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    emissive?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Sets the specular color of the feature, affecting how it reflects light.
     *
     * This property is only applicable for Styles of type `"Polygon"`, `"Box"`, `"Sphere"` or `"Model"`;
     *
     * ### Relationship with Shininess
     * - **Effect:** The `specular` property determines the color of the light reflection, while the {@link shininess} value controls the intensity and size of the reflection.
     * - **Shininess Dependency:** If `specular` is set and `shininess` is not explicitly set, the default {@link shininess} value will be used to control the reflection's appearance.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    specular?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Sets the shininess of the feature, determining how glossy its surface appears.
     * A higher value makes the polygon surface more reflective.
     *
     * This property is only applicable for Styles of type `"Polygon"`, `"Box"`, `"Sphere"` or `"Model"`;
     *
     * ### Relationship with Specular
     * - **Effect:** The `shininess` value controls the size and intensity of the specular highlight, which is colored by the {@link specular} property.
     * - **Specular Dependency:** The `shininess` property enhances the effect of the `specular` color. If `specular` is not set, `shininess` has no visible effect.
     *
     * ### Shininess Value Range and Effect
     * - **Range:** The `shininess` value typically ranges from 0 to 128.
     * - **Low Values (0-10):** Produce a wide, diffused highlight, resulting in a matte or dull appearance.
     * - **High Values (50-128):** Produce a small, intense highlight, resulting in a glossy or shiny appearance.
     *
     * @defaultValue 32
     */
    shininess?: number;

    /**
     * Controls the intensity of the fill color under directional lighting.
     *
     * `fillIntensity` determines how much the feature's fill color is affected by the directional lighting in the scene.
     * A higher value increases the intensity of the fill color, making it more vibrant under strong lighting,
     * while a lower value reduces the effect, resulting in a more muted color.
     *
     * This property is only applicable for Styles of type `"Polygon"`, `"Box"` or `"Sphere"`;
     *
     * The value should range from 0 to 1, where 0 means no color intensity and 1 represents full intensity.
     *
     * @defaultValue 1
     */
    fillIntensity?: number;
}
