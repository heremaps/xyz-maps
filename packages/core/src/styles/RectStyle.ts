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
import {Color, StyleValueFunction, StyleZoomRange} from './LayerStyle';

export interface RectStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Rect';

    /**
     * Indicates the drawing order within a layer.
     * Styles with larger zIndex value are rendered above those with smaller values.
     * The zIndex is defined relative to the "zLayer" property.
     * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
     */
    zIndex: number | StyleValueFunction<number> | StyleZoomRange<number>;

    /**
     * Indicates drawing order across multiple layers.
     * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
     * If no zLayer is defined the zLayer depends on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number>;

    /**
     * Sets the color to fill the Rectangle.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    fill?: Color | StyleValueFunction<Color> | StyleZoomRange<Color>;

    /**
     * Sets the stroke color of the Rectangle.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    stroke?: Color | StyleValueFunction<Color> | StyleZoomRange<Color>;

    /**
     * Sets the width of the Rectangle.
     * The unit of strokeWidth is defined in pixels.
     *
     * @example
     * ```typescript
     * // define a Rectangle that has a strokeWidth of 2 pixels
     * {
     *     zIndex: 0,
     *     type: "Rect",
     *     stroke: "blue",
     *     strokeWidth: 2,
     *     width: 32
     * }
     * ```
     */
    strokeWidth?: number | string | StyleValueFunction<number | number> | StyleZoomRange<string | number>;

    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     * It is valid for all style types.
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number>;

    /**
     * Rotate the Rectangle by the angle in degrees.
     */
    rotation?: number | StyleValueFunction<number> | StyleZoomRange<number>;

    /**
     * Width of the style in pixels.
     * The default unit of width is defined in pixels.
     * For styles of type "Rect" the width can also be defined in meters by using a string: "$\{width\}m".
     * @example
     * ```typescript
     * // define a Rect that has a width (and height) of 2.2 meter
     * {
     *     zIndex: 0,
     *     type: "Rect",
     *     fill: "blue",
     *     width: "2.2m"
     * }
     * ```
     * @example
     * ```typescript
     * // define a Rect that has a width (and height) of 16 pixel
     * {
     *     zIndex: 0,
     *     type: "Rect",
     *     fill: "green",
     *     width: 16
     * }
     * ```
     */
    width?: number | StyleValueFunction<number> | StyleZoomRange<number>;

    /**
     * Height of the REctangle in pixels.
     * The unit of height is defined in pixels.
     * For styles of type "Rect" the height can also be defined in meters by using a string: "$\{width\}m".
     * If the height is not explicitly defined, the value of the width is used as the height.
     *
     * @example
     * ```typescript
     * // define a Rect that has a width of 2 meter and a height of 1 meter.
     * {
     *     zIndex: 0,
     *     type: "Rect",
     *     fill: "blue",
     *     width: "2m",
     *     height: "1m"
     * }
     * ```
     * @example
     * ```typescript
     * // define a Rect that has a width of 20 pixel and a height of 28 pixel.
     * {
     *     zIndex: 0,
     *     type: "Rect",
     *     fill: "green",
     *     width: 20,
     *     height: 28
     * }
     * ```
     */
    height?: number | StyleValueFunction<number> | StyleZoomRange<number>;

    /**
     * Offset the rectangle in pixels on x-axis.
     * A positive value offsets to the right, a negative value to the left.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Rectangle by 1m to the left
     * { type: "Rect", zIndex: 0, fill:'blue', width: 24, offsetX: "-1m"}
     * ```
     */
    offsetX?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string>;

    /**
     * Offset the rectangle in pixels on y-axis.
     * A positive value offsetY offsets downwards, a negative value upwards.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Rectangle by 1m to the top
     * { type: "Rect", zIndex: 0, fill:'blue', width: 24, offsetY: "-1m"}
     * ```
     */
    offsetY?: number | StyleValueFunction<number> | StyleZoomRange<number>;

    /**
     * Offset the rectangle in pixels on z-axis.
     * A positive value offsets up, a negative value down.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset rectangle by 1m to the top
     * { type: "Rect", zIndex: 0, fill:'blue', radius: 24, offsetZ: "1m"}
     * ```
     */
    offsetZ?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string>;

    /**
     * Alignment for styles of type "Rect".
     * Possible values are: "map" and "viewport".
     * "map" aligns to the plane of the map and "viewport" aligns to the plane of the viewport/screen.
     * Default alignment for Text based on point geometries is "viewport" while "map" is the default for line geometries.
     */
    alignment?: 'map' | 'viewport' | StyleValueFunction<string> | StyleZoomRange<string>;

    /**
     * Sets the anchor point for rectangle style used with Line or Polygon geometry.
     *
     * Possible values for Line geometry are "Coordinate" and "Line".
     * - "Coordinate": the respective style is displayed at each coordinate of the polyline.
     * - "Line": the respective style is displayed on the shape of the polyline when there is enough space. See {@link checkLineSpace} to disable the space check.
     *
     * Possible values for Polygon geometry are "Center" and "Centroid".
     * - "Center": the center of the bounding box of the polygon.
     * - "Centroid": the geometric centroid of the polygon geometry.
     *
     * @defaultValue For Polygon geometry the default is "Center". For Line geometry the default is "Coordinate".
     */
    anchor?: 'Line' | 'Coordinate' | 'Centroid'

    /**
     * Enable or disable the space check for point styles on line geometries.
     * Only applies to "Rect" styles with {@link anchor} set to "Line".
     * If check checkLineSpace is enabled the respective style is only displayed if there is enough space on the line,
     * otherwise it is not displayed.
     *
     * @defaultValue true
     */
    checkLineSpace?: boolean

    /**
     * Enable or disable collision detection.
     * If the collision detection is enabled for multiple Styles within the same StyleGroup, the respective Styles are
     * handled as a single Object ("CollisionGroup") where the combined bounding-box is determined automatically.
     *
     * - true: collision are allowed, Collision detection is disabled.
     * - false: avoid collisions, Collision detection is enabled.
     *
     * @defaultValue true
     */
    collide?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean>;

    /**
     * Minimum distance in pixels between repeated style-groups on line geometries.
     * Applies per tile only.
     *
     * @defaultValue 256 (pixels)
     */
    repeat?: number | StyleValueFunction<number> | StyleZoomRange<number>;

    /**
     * The altitude of the style in meters.
     * The altitude defines the distance in the vertical direction between the ground plane at 0 meters and the geometry/style.
     * If altitude is set to true, the altitude from the feature's geometry coordinates will be used automatically.
     * If a number is set for altitude, the altitude of the feature's geometry is ignored and the value of "altitude" is used instead.
     * The height must be defined in meters.
     *
     * @defaultValue false
     *
     * @experimental
     */
    altitude?: number | boolean | StyleValueFunction<number | boolean> | StyleZoomRange<number | boolean>


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
    scaleByAltitude?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean>
}
