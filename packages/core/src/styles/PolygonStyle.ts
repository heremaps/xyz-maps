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
 * Interface for configuring the visual appearance of Polygons.
 */
export interface PolygonStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Polygon';

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
     * Sets the color to fill the polygon.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    fill?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Sets the stroke color of the polygon.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    stroke?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Sets the width of the stroke of the polygon (outline).
     * The unit of strokeWidth is defined in pixels.
     * For Polygons that are using {@link extrude}, the maximum possible strokeWidth is 1.0 pixel.
     * For Styles of type Line the strokeWidth can also be defined in meters by using a string: "$\{width\}m".
     *
     * @example
     * ```typescript
     * // define a red colored polygon with a 2 pixel blue stroke (outline).
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     fill: "red",
     *     stroke: "blue",
     *     strokeWidth: 2
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
    altitude?: number | boolean | StyleValueFunction<number | boolean> | StyleZoomRange<number | boolean> | StyleExpression<number | boolean>;

    /**
     * Extrude a Polygon or MultiPolygon geometry in meters.
     */
    extrude?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * The base of the Extrude in meters.
     * The extrudeBase is defined from the ground to the bottom of the extruded Polygon in meters.
     * The extrudeBase must be less or equal then {@link extrude}.
     *
     * @defaultValue 0
     */
    extrudeBase?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * The `light` property specifies a collection of light sources that can be used to illuminate {@link extrude|extruded polygon} features within the layer.
     * It is a map where each key is a unique light group name, and the value is an array of light objects.
     * Lights can be of various types, including {@link AmbientLight} and {@link DirectionalLight}, and can be used to create different lighting effects.
     *
     * The `light` property allows you to define and organize multiple light sources that influence the rendering of features in the layer.
     *
     * This property is only applicable when the polygon is {@link extrude|extruded}.
     *
     * ### Structure
     * - **Key (string):** A unique identifier for the light group.
     * - **Value (array):** An array of light objects, which can be of type {@link AmbientLight} or {@link DirectionalLight}.
     *
     * ### Relation to {@link LayerStyle.lights}
     * - **{@link Style.light}**: Specifies which single light group to use for illuminating a specific feature. This property must reference a key defined in {@link LayerStyle.lights}.
     * - **Default Light**: If a `FeatureStyle` does not specify a `light`, the light group associated with the `"defaultLight"` key in `LayerStyle.lights` will be used. If `"defaultLight"` is not defined, a default light will be automatically provided.
     * - **Only One Light Group**: Only one light group is used to illuminate a feature. This is either the group specified in `FeatureStyle.light`, or if not specified, the `"defaultLight"` group from {@link LayerStyle.lights}.
     * - **Override Default Light**: To override the default light, set it explicitly in {@link LayerStyle.lights} under the key `"defaultLight"`.
     *
     * ### Examples
     * ```typescript
     * {
     *   lights: {
     *      // Define a light group named "defaultLight" to override the default lighting for the layer
     *    "defaultLight": [{
     *        type: 'ambient',
     *        color: '#fff',
     *        intensity: 0.3
     *    }, {
     *        type: 'directional',
     *        color: '#fff',
     *        direction: [0, 0, 1],
     *        intensity: 1.0
     *    }, {
     *        type: 'directional',
     *        color: '#fff',
     *        direction: [-1, 0, 0],
     *        intensity: 0.2
     *    }],
     *    // Define a light group named "buildingLight" for specific features that use `style.light` set to "buildingLight"
     *    "buildingLight": [
     *       { type: "ambient", color: "#fff", intensity: 1.0 } // A simple ambient light source for buildings
     *     ]
     *   }
     * }
     * ```
     *
     * In the example above:
     * - `"defaultLight"` is a light group that overrides the standard lighting configuration. It includes both an ambient and a directional light source and is used for all illuminated FeatureStyle instances where the light property is not explicitly set.
     * - `"buildingLights"` is a light group containing only an ambient light source. This group will only be used for features where {@link Style.light} is set to `"buildingLights"`.
     * - Each light source can be customized with properties such as `color`, `intensity`, and, for `DirectionalLight`, a `direction` vector.
     *
     * The light specified here will be applied to the rendering of features within the layer. However, only one light group will be used for each feature:
     * - If {@link Style.light} is defined, it will reference a specific light group in `LayerStyle.lights`.
     * - If {@link Style.light} is not defined, the `"defaultLight"` light group (if specified) will be used.
     * - If no `"defaultLight"` light group is set, an automatic default light will be provided.
     *
     * @type { { [name: string]: (AmbientLight | DirectionalLight)[] } }
     */
    light?: { [name: string]: (AmbientLight | DirectionalLight)[] };

    /**
     * Sets the emissive color of the extruded polygon, giving it a glow effect.
     * This property is only applicable when the polygon is {@link extrude|extruded}.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    emissive?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Sets the specular color of the extruded polygon, affecting how it reflects light.
     *
     * This property is only applicable when the polygon is {@link extrude|extruded}.
     *
     * ### Relationship with Shininess
     * - **Effect:** The `specular` property determines the color of the light reflection, while the {@link shininess} value controls the intensity and size of the reflection.
     * - **Shininess Dependency:** If `specular` is set and `shininess` is not explicitly set, the default {@link shininess} value will be used to control the reflection's appearance.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    specular?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Sets the shininess of the extruded polygon, determining how glossy its surface appears.
     * A higher value makes the polygon surface more reflective.
     *
     * This property is only applicable when the polygon is {@link extrude|extruded}.
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
}
