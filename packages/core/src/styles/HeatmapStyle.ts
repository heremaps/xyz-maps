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
 * LinearGradient
 *
 * @example
 * ```typescript
 * {
 *     type: 'LinearGradient',
 *     stops: {
 *         1.0: 'white',
 *         0.9: '#FCFBAE',
 *         0.8: '#FAD932',
 *         0.7: '#F26C19',
 *         0.5: '#C41D6F',
 *         0.3: '#70009C',
 *         0.0: 'rgba(30,0,115,0)'
 *     }
 * };
 */
export interface LinearGradient {
    /**
     * The type is "LinearGradient".
     */
    type: 'LinearGradient',
    /**
     * The stops of the LinearGradient
     */
    stops: {
        [stop: number]: string;
    }
}


/**
 * Interface for configuring the visual appearance of Heatmaps.
 * Heatmaps are particularly good at showing the density of data within a specific area.
 */
export interface HeatmapStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Heatmap';

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
     * The radius in pixels with which to render a single point of the heatmap.
     *
     * @defaultValue 24
     */
    radius?: number | StyleValueFunction<number> | StyleZoomRange<number>;

    /**
     * The fill color is a linear gradient used to colorize the heatmap.
     */
    fill?: LinearGradient,

    /**
     * The heatmap weight defines how heavily a single data point is to be weighted and displayed within the heatmap.
     * The value used is equivalent to the number of actual points at that position.
     * The Weight is particularly useful for clustered data when combined with StyleValueFunction.
     *
     * @example
     * ```typescript
     * // the count property of a clustered point dataset defines how many points are located at the cluster position.
     * { type: "Heatmap", weight: (feature)=>feature.properties.count, fill: ... }
     * ```
     *
     * @defaultValue 1
     */
    weight?: number | StyleValueFunction<number>;

    /**
     * The intensity of the Heatmap is a global multiplier on top of the weight.
     * The intensity is particularly useful for adapting the heatmap to the zoom-level of the map.
     *
     * @defaultValue 1
     */
    intensity?: number | StyleZoomRange<number>;

    /**
     * Defines the global opacity of the heatmap.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     *
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number>;
}
