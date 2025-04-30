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
import {LinearGradient} from './HeatmapStyle';

/**
 * A StyleExpression is a JSON array representing an expression that returns the desired value
 * for a specific style property. It is particularly useful for data-driven styling in map or UI components.
 *
 * The structure of a StyleExpression is as follows:
 * - The first element (index 0) is a string that specifies the operator of the expression.
 * - The subsequent elements are the operands required by the operator.
 *
 * @template ResultType - The type of the value that the expression returns.
 *
 * ## StyleExpression Operators
 *
 * A StyleExpression is a JSON array representing an expression that returns the desired value for a specific style property. Below are the possible operators and their descriptions, along with examples.
 *
 * ### Reference
 * - **`ref`**: References another expression by name.
 *   - Example: `["ref", "otherExpression"]`
 *
 * ### Data Retrieval
 * - **`get`**: Retrieves a property from the input data. The third optional operand specifies the input data from which to retrieve the property. If not provided, it defaults to `feature.properties`.
 *
 *   The property name can also be a global map context variable:
 *   - `$zoom`: The current zoom level.
 *   - `$layer`: The name of the datasource layer.
 *   - `$geometryType`: The type of the current feature geometry ("line", "point", "polygon").
 *   - `$id`: The ID of the current feature.
 *
 *   - Example: `["get", "propertyName"]` // Retrieves `propertyName` from `feature.properties`.
 *   - Example with input data: `["get", "propertyName", { custom: "data" }]` // Retrieves `propertyName` from the specified input data.
 *   - Example with global map context variable: `["get", "$zoom"]` // Retrieves the current zoom level.
 *
 * ### Arithmetic
 * - **`+`**: Adds two numbers.
 *   - Example: `["+", 2, 3]` // Outputs: 5
 * - **`-`**: Subtracts the second number from the first.
 *   - Example: `["-", 5, 3]` // Outputs: 2
 * - **`*`**: Multiplies two numbers.
 *   - Example: `["*", 2, 3]` // Outputs: 6
 * - **`/`**: Divides the first number by the second.
 *   - Example: `["/", 6, 3]` // Outputs: 2
 * - **`%`**: Computes the remainder of dividing the first number by the second.
 *   - Example: `["%", 5, 2]` // Outputs: 1
 * - **`floor`**: Rounds down a number to the nearest integer.
 *   - Example: `["floor", 4.7]` // Outputs: 4
 * - **`min`**: Returns the smallest number.
 *   - Example: `["min", 1, 2, 3]` // Outputs: 1
 * - **`max`**: Returns the largest number.
 *   - Example: `["max", 1, 2, 3]` // Outputs: 3
 *
 * ### Logical
 * - **`all`**: Returns true if all conditions are true.
 *   - Example: `["all", true, true]` // Outputs: true
 * - **`any`**: Returns true if any condition is true.
 *   - Example: `["any", true, false]` // Outputs: true
 * - **`!`**: Negates a boolean value.
 *   - Example: `["!", true]` // Outputs: false
 * - **`!has`**: Checks if a property does not exist.
 *   - Example: `["!has", "propertyName"]`
 * - **`has`**: Checks if a property exists.
 *   - Example: `["has", "propertyName"]`
 * - **`none`**: Returns true if no conditions are true.
 *   - Example: `["none", false, false]` // Outputs: true
 *
 * ### Comparison
 * - **`==`**: Checks if two values are equal.
 *   - Example: `["==", 2, 2]` // Outputs: true
 * - **`!=`**: Checks if two values are not equal.
 *   - Example: `["!=", 2, 3]` // Outputs: true
 * - **`>`**: Checks if the first value is greater than the second.
 *   - Example: `[" >", 3, 2]` // Outputs: true
 * - **`>=`**: Checks if the first value is greater than or equal to the second.
 *   - Example: `[" >=", 3, 3]` // Outputs: true
 * - **`<=`**: Checks if the first value is less than or equal to the second.
 *   - Example: `["<=", 2, 2]` // Outputs: true
 * - **`<`**: Checks if the first value is less than the second.
 *   - Example: `["<", 2, 3]` // Outputs: true
 * - **`^=`**: Checks if a string starts with a given substring.
 *   - Example: `["^=", "hello", "he"]` // Outputs: true
 * - **`$=`**: Checks if a string ends with a given substring.
 *   - Example: `["$=", "hello", "lo"]` // Outputs: true
 *
 * ### String Manipulation
 * - **`split`**: Splits a string by a delimiter.
 *   - Example: `["split", "a,b,c", ","]` // Outputs: ["a", "b", "c"]
 * - **`to-string`**: Converts a value to a string.
 *   - Example: `["to-string", 123]` // Outputs: "123"
 * - **`concat`**: Concatenates multiple strings.
 *   - Example: `["concat", "hello", " ", "world"]` // Outputs: "hello world"
 * - **`regex-replace`**: Replaces parts of a string matching a regex.
 *   - Example: `["regex-replace", "hello world", "world", "there"]` // Outputs: "hello there"
 * - **`slice`**: Extracts a section of a string.
 *   - Example: `["slice", "hello", 0, 2]` // Outputs: "he"
 * - **`at`**: Gets the character at a specified index in a string.
 *   - Example: `["at", "hello", 1]` // Outputs: "e"
 * - **`length`**: Gets the length of a string.
 *   - Example: `["length", "hello"]` // Outputs: 5
 *
 * ### Conditional
 * - **`case`**: Evaluates conditions in order and returns the corresponding result for the first true condition.
 *   - Example: `["case", ["==", 1, 1], "one", ["==", 2, 2], "two", "default"]` // Outputs: "one"
 * - **`step`**: Returns a value from a step function based on input.
 *   - Example: `["step", 3, "small", 5, "medium", 10, "large"]` // Outputs: "small"
 * - **`match`**: Returns a value based on matching input values.
 *   - Example: `["match", "a", "a", 1, "b", 2, 0]` // Outputs: 1
 *
 * ### Utility
 * - **`literal`**: Returns a literal value.
 *   - Example: `["literal", [1, 2, 3]]` // Outputs: [1, 2, 3]
 * - **`lookup`**: Finds an entry in a table that matches the given key values. The entry with the most matching keys is returned.
 *   If multiple entries match equally, one of them is returned.
 *   If no match is found, the default entry (if any) is returned. If no default entry is defined, null is returned.
 *     - The `lookupTable` should be an array of objects, each with a `keys` member and an `attributes` member:
 *       - `keys`: An object containing key-value pairs used for matching.
 *       - `attributes`: An object containing the attributes to be returned when a match is found.
 *   - Example:
 *     ```javascript
 *     {
 *     "definitions": {
 *       "lookupTable": [ "literal", [
 *         { "keys": { "country": "US" }, "attributes": { "population": 331000000 } },
 *         { "keys": { "country": "US", "state": "CA" }, "attributes": { "population": 39500000 } },
 *         { "keys": {}, "attributes": { "population": 7800000000 } } // Default entry
 *       ]]
 *     }
 *     }
 *     // This example looks up the population for the state of California in the United States from the `lookupTable`.
 *     ["lookup", { "country": "US", "state": "CA" }, ["ref", "lookupTable"]] // Outputts: `{ "population": 39500000 }`.
 *     ```
 *
 * ### Type Conversion
 * - **`number`**: Converts a value to a number.
 *   - Example: `["number", "123"]` // Outputs: 123
 * - **`boolean`**: Converts a value to a boolean.
 *   - Example: `["boolean", "true"]` // Outputs: true
 * - **`to-number`**: Converts a value to a number.
 *   - Example: `["to-number", "123"]` // Outputs: 123
 * - **`to-boolean`**: Converts a value to a boolean.
 *   - Example: `["to-boolean", "true"]` // Outputs: true
 *
 * ### Zoom and Interpolation
 * - **`zoom`**: Returns the current zoom level.
 *   - Example: `["zoom"]` // Outputs: current zoom level
 * - **`interpolate`**: Interpolates between values based on zoom level.
 *   - Example: `["interpolate", ["linear"], ["zoom"], 10, 1, 15, 10]`
 *
 * Example:
 * ```typescript
 * const expression: StyleExpression = ["==", ["get", "property"], "value"];
 * ```
 * In this example, `"=="` is the operator, and `["get", "property"]` and `"value"` are the operands.
 *
 * Operators can include logical, arithmetic, string manipulation, and other types of operations, which are evaluated
 * to determine the final value of the style property.
 */
export type StyleExpression<ResultType = any> = [string, ...any[]]; // JSONExpression

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
export type StyleZoomRange<Type> = { [zoom: number | string]: Type }

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

export type StyleGroup = Style[];

// type StrictExclude<T, U> = T extends U ? U extends T ? never : T : T;
export type ParsedStyleProperty<S> = Exclude<S, StyleExpression<any> | StyleValueFunction<any> | StyleZoomRange<any>>;


/**
 * The `Light` interface defines a base structure for various types of lighting in the styling system. It includes properties for color and intensity, and is extended by specific light types such as `AmbientLight` and `DirectionalLight`.
 *
 * @interface Light
 */
interface Light {
    /**
     * Specifies the type of light.
     */
    type: string;
    /**
     * The color of the light.
     * Can be specified as a `Color` value, a `StyleZoomRange<Color>`, a function that returns a `Color` based on zoom level, or a `StyleExpression<Color>`.
     */
    color: Color | StyleZoomRange<Color> | ((zoomlevel: number) => Color) | StyleExpression<Color>;
    /**
     * The intensity of the light. This property is optional and defaults to 1 if not specified.
     */
    intensity?: number;
    /**
     * @internal
     * @hidden
     */
    id?: number;
}

/**
 * The `AmbientLight` interface represents ambient lighting, which provides a constant level of illumination across all objects.
 *
 * @extends Light
 */
export interface AmbientLight extends Light {
    /**
     * The type of light. For `AmbientLight`, this is always 'ambient'.
     */
    type: 'ambient';
}

/**
 * The `DirectionalLight` interface represents directional lighting, which simulates light coming from a specific direction.
 *
 * @extends Light
 */
export interface DirectionalLight extends Light {
    /**
     * The type of light. For `DirectionalLight`, this is always 'directional'.
     */
    type: 'directional';

    /**
     * The direction of the light, represented as a vector. This determines the direction from which the light is coming.
     */
    direction: number[];
}


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
export type Color = string | number | [number, number, number, number?];

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
     * Option LayerStyle definitions that can be references and reused by {@link Style|Styles} within the Layer.
     */
    definitions?: { [definitionName: string]: boolean | number | StyleExpression | any[] | null };

    /**
     * @deprecated define strokeWidth style property using a "StyleZoomRange" value instead.
     * @hidden
     */
    strokeWidthZoomScale?: (level: number) => number;

    /**
     * Specifies the background color of the layer.
     *
     * This property can accept different types of values to determine the background color:
     * - A fixed `Color`.
     * - A `StyleZoomRange<Color>` object to define color based on zoom levels.
     * - A function `(zoomlevel: number) => Color` to compute the color dynamically based on the zoom level.
     * - A `StyleExpression<Color>` to compute the color using a style expression.
     */
    backgroundColor?: Color | StyleZoomRange<Color> | ((zoomlevel: number) => Color) | StyleExpression<Color>;

    /**
     * Defines the sky color of the map.
     * - The sky becomes visible when the map is pitched to higher angles.
     * - When multiple layers with different sky colors are used, the sky color from the bottommost layer is applied.
     * - Supports various formats, including:
     *    - `Color`: A single color applied across all zoom levels.
     *    - `StyleZoomRange<Color>`: Specifies a range of colors based on zoom levels.
     *    - `(zoomlevel: number) => Color`: A function that dynamically determines the color based on the current zoom level.
     *    - `StyleExpression<Color>`: An expression to compute color based on style parameters.
     *    - `LinearGradient`: Applies a gradient effect for smooth transitions in sky color.
     *      - When using `LinearGradient`, stops at `0` represent the color near the horizon (close to the ground), and stops at `1` represent the color in the sky at the top of the screen.
     *      - The full gradient (0 to 1) becomes fully visible only when the map pitch is set to maximum (85 degrees).
     */
    skyColor?: Color | StyleZoomRange<Color> | ((zoomlevel: number) => Color) | StyleExpression<Color> | LinearGradient;

    /**
     * The `lights` property specifies a collection of light sources that can be used to illuminate features within the layer.
     * It is a map where each key is a unique light group name, and the value is an array of light objects.
     * Lights can be of various types, including {@link AmbientLight} and {@link DirectionalLight}, and can be used to create different lighting effects.
     *
     * The `lights` property allows you to define and organize multiple light sources that influence the rendering of features in the layer.
     *
     * ### Structure
     * - **Key (string):** A unique identifier for the light group.
     * - **Value (array):** An array of light objects, which can be of type {@link AmbientLight} or {@link DirectionalLight}.
     *
     * ### Relation to Style.light
     * - **{@link Style.light}**: Specifies which single light group to use for illuminating a specific feature. This property must reference a key defined in `LayerStyle.lights`.
     * - **Default Light**: If a `FeatureStyle` does not specify a `light`, the light group associated with the `"defaultLight"` key in `LayerStyle.lights` will be used. If `"defaultLight"` is not defined, a default light will be automatically provided.
     * - **Only One Light Group**: Only one light group is used to illuminate a feature. This is either the group specified in `FeatureStyle.light`, or if not specified, the `"defaultLight"` group from `LayerStyle.lights`.
     * - **Override Default Light**: To override the default light, set it explicitly in `LayerStyle.lights` under the key `"defaultLight"`.
     *
     * ### Examples
     * ```typescript
     * {
     *   lights: {
     *      // Define a light group named "default" to override the default lighting for the layer
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
     *    // Define a light group named "buildingLights" for specific features
     *     "buildingLights": [
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
     * The lights specified here will be applied to the rendering of features within the layer. However, only one light group will be used for each feature:
     * - If {@link Style.light} is defined, it will reference a specific light group in `LayerStyle.lights`.
     * - If {@link Style.light} is not defined, the `"defaultLight"` light group (if specified) will be used.
     * - If no `"defaultLight"` light group is set, an automatic default light will be provided.
     *
     * @type { { [name: string]: (AmbientLight | DirectionalLight)[] } }
     */
    lights?: { [name: string]: (AmbientLight | DirectionalLight)[] };

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
     *  If `assign` is not defined, the {@link Style.filter} property must be used to determine whether the feature should be rendered.
     *
     *  @param feature - the feature to which style is applied
     *  @param zoomlevel - the zoomlevel of the tile the feature should be rendered in
     *
     *  @returns the key/identifier of the styleGroup in the styleGroupMap, or null/undefined if the feature should not be rendered.
     */
    assign?: (feature: Feature, zoomlevel: number) => string | null | undefined;

    /**
     * Indicates the global drawing order across multiple layers.
     * This value acts as a fallback for the {@link Style.zLayer} property if not explicitly defined there.
     * Styles with higher zLayer values are rendered on top of those with lower values.
     * If no `zLayer` is defined, the display layer order is used by default.
     */
    zLayer?: number;


    /**
     * Specifies whether to display a wireframe for debugging purposes.
     * Currently only supported for `Model` styles.
     *
     * - If set to `true`, the wireframe will be shown with an automatically inverted color
     *   relative to the main color of the layer.
     * - If set to a `Color`, the wireframe will be displayed in the specified color.
     * - If set to `false`, the wireframe will not be shown.
     *
     * Default is `false`.
     *
     * @hidden
     * @internal
     */
    showWireframe?: boolean | Color;
}
