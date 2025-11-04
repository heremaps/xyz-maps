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
 * Interface for configuring the visual appearance of VerticalLines.
 */
export interface VerticalLineStyle {
    /**
     * Indicates type of the shape to render.
     */
    type: 'VerticalLine';

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
     * Sets the stroke color of the shape.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    stroke?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;

    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     * It is valid for all style types.
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;

    /**
     * Vertical offset of the shape along the z-axis.
     *
     * Shifts or extends the line relative to its reference altitude.
     * - Positive values move the line upward.
     * - Negative values move the line downward.
     *
     * Units:
     * - Default is pixels.
     * - Can also be a string with units (e.g., `"1m"` for meters).
     *
     * Special notes for VerticalLine:
     * - `altitudeReference` defines which point the `altitude` value refers to (top or base).
     * - `offsetZ` **always extends the line upward** from the reference point, regardless of whether
     *   `altitudeReference` is `'base'` or `'top'`.
     * - With `altitude: 'terrain'`, `offsetZ` shifts the line relative to the terrain surface.
     *
     * @example
     * ```ts
     * // Move the VerticalLine 8 px upward from its reference
     * { type: "VerticalLine", zIndex: 0, stroke: "black", offsetZ: 8 }
     *
     * // Base = terrain, extend line 1 m upward
     * { type: "VerticalLine", zIndex: 0, stroke: "black", altitude: "terrain", altitudeReference: "base", offsetZ: "1m" }
     *
     * // Top = terrain, extend line 2 m upward
     * { type: "VerticalLine", zIndex: 0, stroke: "black", altitude: "terrain", altitudeReference: "top", offsetZ: "2m" }
     * ```
     */
    offsetZ?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;

    /**
     * Defines how the altitude value is interpreted for the VerticalLine.
     *
     * By default, the meaning of altitude depends on the style type:
     * - For most flat styles (Circle, Rect, Icon, etc.), `altitude` defines the **center** position.
     * - For VerticalLine, {@link VerticalLineStyle.altitude} defines a **vertical reference** — either the top or the base.
     *
     * Supported values:
     * - `'top'`: the altitude specifies the **top** of the line; the base is fixed at 0 m (global ground).
     * - `'base'`: the altitude specifies the **base** (bottom) of the line; the top must be defined via {@link VerticalLineStyle.offsetZ}.
     *
     * Notes:
     * - This property only affects VerticalLine styles; other style types ignore it.
     * - When {@link VerticalLineStyle.altitude} is `'terrain'` and `altitudeReference` is not specified,
     *   `'base'` is automatically assumed (the line stands on the terrain surface).
     *
     * @defaultValue 'top'
     * @experimental
     */
    altitudeReference?: 'top' | 'base';

    /**
     * Altitude of the VerticalLine, in meters.
     *
     * Defines the reference height used together with {@link VerticalLineStyle.altitudeReference}
     * to determine the vertical placement of the line.
     *
     * Supported values:
     * - **number** – Fixed altitude in meters, relative to the global ground plane.
     * - **true** – Use the altitude (z) from the feature geometry if present; otherwise 0 m.
     * - **false** – Ignore any z-value from the feature geometry and use 0 m.
     * - **'terrain'** – Clamp to the sampled terrain height.
     *
     * Notes:
     * - When `altitudeReference = 'top'`, the altitude defines the **top** of the line;
     *   the base is fixed at 0 m.
     * - When `altitudeReference = 'base'`, the altitude defines the **base** of the line;
     *   the top must be specified using {@link VerticalLineStyle.offsetZ}.
     * - {@link VerticalLineStyle.offsetZ} extends the line upward from the reference altitude.
     *   With 'terrain', it defines how far above the terrain the line extends.
     *
     * Examples:
     * ```ts
     * // Top = 100 m, Base = 0 m
     * { type: "VerticalLine", altitudeReference: "top", altitude: 100 }
     *
     * // Base = terrain, Top = terrain + 2 m
     * { type: "VerticalLine", altitudeReference: "base", altitude: "terrain", offsetZ: "2m" }
     *
     * // Base = 0, Top = feature Z (if available)
     * { type: "VerticalLine", altitudeReference: "top", altitude: true }
     * ```
     *
     * @defaultValue true
     * @experimental
     */
    altitude?: number | boolean | 'terrain'
        | StyleValueFunction<number | boolean | 'terrain'>
        | StyleZoomRange<number | boolean | 'terrain'>
        | StyleExpression<number | boolean | 'terrain'>;
}
