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

type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array;

/**
 * The Material used to render the model/geometry.
 */
export interface Material {
    /**
     * Diffuse color of the material.
     *
     * @defaultValue
     */
    diffuse?: number[],
    /**
     * The diffuse (texture) map used by the material.
     */
    diffuseMap?: string,
    /**
     * The used primitive type to render the model geometry.
     *
     * @defaultValue "Triangles"
     */
    mode?: 'Triangles' | 'Points',
    /**
     * The used pointSize in pixels to render when mode is set to "Points".
     */
    pointSize?: number
    /**
     * The Illumination Mode of the material.
     *
     * - mode 0: Constant color mode. Colors, no lightning, no shading
     * - mode 1: Diffuse lightning mode.
     *
     * @defaultValue 1
     */
    illumination?: number
}

/**
 * Interface for configuring the visual appearance of Models.
 *
 * @experimental
 */
export interface ModelStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Model';

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
     * The Model data that should be rendered.
     */
    data: {
        /**
         * Textures used by Materials.
         */
        textures?: { [name: string]: HTMLCanvasElement | HTMLImageElement | { width: number, height: number, pixels?: Uint8Array } };

        /**
         * The Geometries of the Model.
         */
        geometries: {
            /**
             * The geometry data to render.
             */
            data: {
                /**
                 * Vertex positions
                 */
                position: TypedArray | number[],
                /**
                 * Vertex indices
                 */
                index?: Int16Array | Int32Array | number[],
                /**
                 * Vertex normals
                 */
                normal?: TypedArray | number[],
                /**
                 * Texture coordinates
                 */
                texcoord?: number[],
                /**
                 * Per Vertex color
                 */
                color?: string | [number, number, number, number] | number[]
            };
            /**
             * The name of the Material the geometry should be rendered with.
             * If the used material is not defined in {@link ModelStyle.data.materials| Materials}, or none is defined, the default material will be used.
             */
            material?: string;
            /**
             * @hidden
             * @internal
             */
            bbox?: number[];
        }[],
        /**
         * Materials referenced by {@link ModelStyle.data.geometries}.
         */
        materials?: {
            [name: string]: Material
        }
    };

    /**
     * Configure Face culling.
     * To enable culling set cullFace to "Front" or "Back", to disable set to false.
     * Face culling is disabled by default.
     *
     * @defaultValue: false
     */
    cullFace?: 'Front' | 'Back' | false;

    /**
     * scale the model.
     */
    scale?: number[];
    /**
     * translate the model.
     */
    translate?: number[];
    /**
     * rotate the model.
     */
    rotate?: number[];
    /**
     * transform the model.
     */
    transform?: number[];

    modelId?: number;
}
