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
 * Interface for configuring the visual appearance of Boxes.
 */
export interface BoxStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Box';

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
     * If no zLayer is defined the zLayer depends on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number> | StyleExpression<number>;

    /**
     * Sets the color to fill the Box.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    fill?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Sets the stroke color of the Box.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    stroke?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Sets the width of the stroke.
     * The unit of strokeWidth is defined in pixels.
     *
     * @example
     * ```typescript
     * // define a red filled Box that with a blue stroke of 2px width.
     * {
     *     zIndex: 0,
     *     type: "Box",
     *     fill: "red",
     *     stroke: "blue",
     *     strokeWidth: "2
     * }
     * ```
     */
    strokeWidth?: number | string | StyleValueFunction<number | number> | StyleZoomRange<string | number> | StyleExpression<number | string>;

    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     *
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * The Width of the Box.
     * The unit of width is defined in pixels.
     *
     * @example
     * ```typescript
     * // define a Box that has a width, height and depth of 32 pixels.
     * {
     *     zIndex: 0,
     *     type: "Box",
     *     fill: "blue",
     *     width: 32
     * }
     * ```
     */
    width: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * The Height of the Box.
     * The unit of height is defined in pixels.
     * If the height is not explicitly defined, the value of the width is used as the height.
     *
     * @example
     * ```typescript
     * // define a Box that have a width of 32px and a height of 48px.
     * {
     *     zIndex: 0,
     *     type: "Box",
     *     fill: "blue",
     *     width: 32,
     *     height: 48
     * }
     * ```
     */
    height?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * The depth of the Box.
     * The depth defines the length of the edges of a "Box" parallel to the Z axis.
     * If the depth is not explicitly defined, the value of the "width" is used as the height.
     *
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
     * Offset the Box in pixels on x-axis.
     * A positive value offsets to the right, a negative value to the left.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Box by 8px to the right.
     * { type: "Box", zIndex: 0, with: 32, fill: 'red', offsetX: 8}
     * ```
     */
    offsetX?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;

    /**
     * Offset the Box in pixels on y-axis.
     * A positive value offsetY offsets downwards, a negative value upwards.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Box by 8px to the bottom
     * { type: "Box", zIndex: 0, fill: 'red', width:32, offsetY: 8}
     *
     * // offset Box by 1m to the top
     * { type: "Box", zIndex: 0, fill: 'blue', width: 32, offsetY: "-1m"}
     * ```
     */
    offsetY?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * Offset the Box in pixels on z-axis.
     * A positive value offsets up, a negative value down.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Image by 8px to the top.
     * { type: "Box", zIndex: 0, fill: 'red', width:32, offsetZ: 8}
     *
     * // offset Circle by 1m to the top
     * { type: "Box", zIndex: 0, fill: 'red', width:32, offsetZ: "1m"}
     * ```
     */
    offsetZ?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;

    /**
     * The altitude of the center of the Box in meters.
     * The altitude defines the distance in the vertical direction between the ground plane at 0 meters and the geometry/style.
     * If altitude is set to true, the altitude from the feature's geometry coordinates will be used automatically.
     * If a number is set for altitude, the altitude of the feature's geometry is ignored and the value of "altitude" is used instead.
     * The height must be defined in meters.
     *
     * @defaultValue false
     *
     * @experimental
     */
    altitude?: number | boolean | StyleValueFunction<number | boolean> | StyleZoomRange<number | boolean> | StyleExpression<number | boolean>;

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
