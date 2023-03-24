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
import {StyleValueFunction, StyleZoomRange} from './LayerStyle';

/**
 * Interface for configuring the visual appearance of Rectangles.
 */
export interface SphereStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Sphere';

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
     * Sets the color to fill the shape.
     * This attribute is valid for Circle, Rect, Text and Polygon.
     *
     * The color can be specified in the following ways:
     * - CSS color names: "red"
     * - RGB(A) values: "rgba(255,0,0,1.0)"
     * - hexadecimal values: "#ff0000"
     */
    fill?: string | StyleValueFunction<string> | StyleZoomRange<string>;

    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     * It is valid for all style types.
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number>;

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
    radius?: number | StyleValueFunction<number> | StyleZoomRange<number>;

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
    offsetX?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string>;

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
    offsetY?: number | StyleValueFunction<number> | StyleZoomRange<number>;

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
    offsetZ?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string>;

    /**
     * The altitude of the style in meters.
     * The altitude defines the distance in the vertical direction between the ground plane at 0 meters and the geometry/style.
     * If altitude is set to true, the altitude from the feature's geometry coordinates will be used automatically.
     * If a number is set for altitude, the altitude of the feature's geometry is ignored and the value of "altitude" is used instead.
     * The height must be defined in meters.
     * This attribute is valid for styles of type "Rect", "Image", "Text", "Circle", "Line", "Box" or "Sphere".
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
