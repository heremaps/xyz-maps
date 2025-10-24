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
import {Color, StyleExpression, StyleValueFunction, StyleZoomRange} from './LayerStyle';

/**
 * Interface for configuring the visual appearance of Text.
 */
export interface TextStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Text';

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
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number> | StyleExpression<number>;

    /**
     * Sets the color to fill the text.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    fill?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Sets the stroke color of the text (outline).
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    stroke?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Sets the width of the stroke (outline) to display the text with.
     * The unit of strokeWidth is defined in pixels.
     *
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
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     * It is valid for all style types.
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

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
    text?: string | number | boolean | StyleValueFunction<string | number | boolean> | StyleZoomRange<string | number | boolean>;

    /**
     * The "textAnchor" attribute is used to align the text relative to the {@link anchor} point.
     *
     * Possible values:
     * - "Left": The text is aligned left to the anchor.
     * - "Right": The text is aligned right to the anchor.
     * - "Center": The center of the Text is placed at the {@link anchor} point.
     * - "Top": The top of the Text is placed closest the {@link anchor} point.
     * - "TopLeft": The top left side of the Text is placed closest the {@link anchor} point.
     * - "TopRight": The top right side of the Text is placed closest the {@link anchor} point.
     * - "Bottom": The bottom of the Text is placed closest to the {@link anchor} point.
     * - "BottomLeft": The bottom left side of the Text is placed closest the {@link anchor} point.
     * - "BottomRight": The bottom right side of the Text is placed closest the {@link anchor} point.
     *
     * @defaultValue "Center"
     */
    textAnchor?: 'Left' | 'Center' | 'Right' | 'Top' | 'TopLeft' | 'TopRight' | 'Bottom' | 'BottomLeft' | 'BottomRight' | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;

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
     * // display the id of the feature
     * ...
     * textRef: "id"
     * ```
     */
    textRef?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;

    /**
     * Offset the text in pixels on x-axis.
     * A positive value offsets to the right, a negative value to the left.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Text by 1m to the left
     * { type: "Text", zIndex: 0, fill:'blue', offsetX: "-1m", text: 'XYZ'}
     * ```
     */
    offsetX?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;

    /**
     * Offset the text in pixels on y-axis.
     * A positive value offsetY offsets downwards, a negative value upwards.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Text by 1m to the left
     * { type: "Text", zIndex: 0, fill:'blue', offsetY: "-1m", text: 'XYZ'}
     * ```
     */
    offsetY?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * Offset the text in pixels on z-axis.
     * A positive value offsets up, a negative value down.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Text by 1m to the top
     * { type: "Text", zIndex: 0, fill:'blue', text: 'XYZ', offsetZ: "1m"}
     * ```
     */
    offsetZ?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;

    /**
     * Alignment for styles of type "Text".
     * Possible values are: "map" and "viewport".
     * "map" aligns to the plane of the map and "viewport" aligns to the plane of the viewport/screen.
     * Default alignment for Text based on point geometries is "viewport" while "map" is the default for line geometries.
     */
    alignment?: 'map' | 'viewport' | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;

    /**
     * Rotate text around it's center in degrees.
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
     * Sets the anchor point for styles of type "Text" used with Line or Polygon geometry.
     *
     * Possible values for Line geometry are "Coordinate" and "Line".
     * - "Coordinate": the respective style is displayed at each coordinate of the polyline.
     * - "Line": the respective style is displayed on the shape of the polyline when there is enough space. See {@link checkLineSpace} to disable the space check.
     *
     * Possible values for Polygon geometry are "Center" and "Centroid".
     * - "Center": the center of the bounding box of the polygon.
     * - "Centroid": the geometric centroid of the polygon geometry.
     *
     * @defaultValue For Polygon geometry the default is "Center". For Line geometry the default for styles of type "Text" is "Line".
     */
    anchor?: 'Line' | 'Coordinate' | 'Centroid' | 'Center' | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;

    /**
     * Enable or disable the space check for point styles on line geometries.
     * Only applies to "Text" styles with {@link anchor} set to "Line".
     * If check checkLineSpace is enabled the respective style is only displayed if there is enough space on the line,
     * otherwise it is not displayed.
     *
     * @defaultValue true
     */
    checkLineSpace?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;

    /**
     * Enable or disable collision detection.
     * If the collision detection is enabled for multiple Styles within the same StyleGroup, the respective Styles are
     * handled as a single Object ("CollisionGroup") where the combined bounding-box is determined automatically.
     *
     * - true: collision are allowed, Collision detection is disabled.
     * - false: avoid collisions, Collision detection is enabled.
     *
     * @defaultValue false
     */
    collide?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;

    /**
     * Enables collision detection and combines all styles of a StyleGroup with the same "CollisionGroup" into a single logical object for collision detection.
     */
    collisionGroup?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;

    /**
     * Altitude of the Text center in meters.
     *
     * Describes the vertical distance from the global ground plane (0m) to the Text.
     *
     * Supported values:
     * - false (default): place at 0m.
     * - true: use the altitude (z) from the feature geometry if present, else 0. Not re-aligned to the rendered terrain.
     *         If the geometry altitude source differs from the TerrainTileLayer source/resolution, the Text can appear
     *         slightly above or below the visible terrain surface.
     * - number: fixed absolute altitude in meters. Also not adjusted when terrain tiles load; may not perfectly sit
     *           on the terrain unless both use exactly the same elevation source, datum and resolution.
     * - 'terrain': sample (clamp to) the current terrain surface height. While the terrain tile is not yet loaded
     *              (or no terrain layer exists) the altitude is 0 and updates once data becomes available.
     *
     * Notes:
     * - Use 'terrain' to keep the Text visually seated on the rendered terrain.
     * - Use a numeric value for a constant absolute elevation independent of terrain updates.
     * - To position something N meters above terrain: use 'terrain' plus offsetZ (e.g. offsetZ: '5m').
     * - Expect mismatches (floating / sinking) when using true or a fixed number with a different terrain data source.
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
}
