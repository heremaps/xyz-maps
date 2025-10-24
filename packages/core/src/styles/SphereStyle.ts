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
    Color,
    DirectionalLight,
    StyleExpression,
    StyleValueFunction,
    StyleZoomRange
} from './LayerStyle';

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
     * Sets the color to fill the Sphere.
     * This attribute is valid for Circle, Rect, Text and Polygon.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    fill?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     * It is valid for all style types.
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * The Radius of the Sphere.
     * The default unit is pixels.
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
     */
    radius?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * Offset the shape in pixels on x-axis.
     * A positive value offsets to the right, a negative value to the left.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Sphere by 1m to the left
     * { type: "Sphere", zIndex: 0, fill:'blue', radius: 24, offsetX: "-1m"}
     * ```
     */
    offsetX?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;

    /**
     * Offset the shape in pixels on y-axis.
     * A positive value offsetY offsets downwards, a negative value upwards.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Sphere by 1m to the top
     * { type: "Sphere", zIndex: 0, fill:'blue', radius: 24, offsetY: "-1m"}
     * ```
     */
    offsetY?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * Offset the shape in pixels on z-axis.
     * A positive value offsets up, a negative value down.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Sphere by 1m to the top
     * { type: "Sphere", zIndex: 0, fill:'blue', radius: 24, offsetZ: "1m"}
     * ```
     */
    offsetZ?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;

    /**
     * Altitude of the Sphere center in meters.
     *
     * Describes the vertical distance from the global ground plane (0m) to the Sphere.
     *
     * Supported values:
     * - false (default): place at 0m.
     * - true: use the altitude (z) from the feature geometry if present, else 0. Not re-aligned to the rendered terrain.
     *         If the geometry altitude source differs from the TerrainTileLayer source/resolution, the Sphere can appear
     *         slightly above or below the visible terrain surface.
     * - number: fixed absolute altitude in meters. Also not adjusted when terrain tiles load; may not perfectly sit
     *           on the terrain unless both use exactly the same elevation source, datum and resolution.
     * - 'terrain': sample (clamp to) the current terrain surface height. While the terrain tile is not yet loaded
     *              (or no terrain layer exists) the altitude is 0 and updates once data becomes available.
     *
     * Notes:
     * - Use 'terrain' to keep the Sphere visually seated on the rendered terrain.
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
     * Sets the emissive color of the `"Sphere"`, giving it a glow effect.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    emissive?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Sets the specular color of the `"Sphere"`, affecting how it reflects light.
     *
     * ### Relationship with Shininess
     * - **Effect:** The `specular` property determines the color of the light reflection, while the {@link shininess} value controls the intensity and size of the reflection.
     * - **Shininess Dependency:** If `specular` is set and `shininess` is not explicitly set, the default {@link shininess} value will be used to control the reflection's appearance.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    specular?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Sets the shininess of the `"Sphere"`, determining how glossy its surface appears.
     * A higher value makes the `"Sphere"` surface more reflective.
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
     * `fillIntensity` determines how much the `"Sphere"`'s fill color is affected by the directional lighting in the scene.
     * A higher value increases the intensity of the fill color, making it more vibrant under strong lighting,
     * while a lower value reduces the effect, resulting in a more muted color.
     *
     * The value should range from 0 to 1, where 0 means no color intensity and 1 represents full intensity.
     *
     * @defaultValue 1
     */
    fillIntensity?: number;
}
