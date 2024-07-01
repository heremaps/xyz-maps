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
import {StyleExpression, StyleValueFunction, StyleZoomRange} from './LayerStyle';

type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array;

/**
 * The Material to render the model/geometry using the Phong reflection model.
 *
 * @experimental
 */
export interface Material {
    /**
     * The Ambient color reflection intensity constant of the material.
     *
     * @defaultValue [1,1,1] (white)
     */
    ambient?: number[];
    /**
     * The emissive color of the material.
     * Emissive Color is solid and unaffected by other lightning.
     *
     * @defaultValue [1,1,1] (white)
     */
    emissive?: number[];
    /**
     * Diffuse color of the material.
     *
     * @defaultValue [1, 1, 1] (white)
     */
    diffuse?: number[];
    /**
     * The name of the diffuse map used by the material.
     * The actual texture must be defined in {@link ModelData.textures}.
     */
    diffuseMap?: string;

    /**
     * The shininess of the material determines how shiny the {@link Material.specular | specular} highlights are rendered.
     * A higher value results in a sharper, more focused highlight, while lower values cause the highlight to become more blown out.
     * The value range is from 0 to 1000.
     *
     * @defaultValue 32
     */
    shininess?: number;

    /**
     * Specular defines the specular highlight color of the material.
     *
     * @defaultValue [1, 1, 1] (white)
     */
    specular?: number[];

    /**
     * The name of the specular map used by the material.
     * The actual texture must be defined in {@link ModelData.textures}.
     */
    specularMap?: string;

    /**
     * The name of the normal map used by the material.
     * The actual texture must be defined in {@link ModelData.textures}.
     */
    normalMap?: string;

    /**
     * The used primitive type to render the model geometry.
     *
     * @defaultValue "Triangles"
     */
    mode?: 'Triangles' | 'Points';
    /**
     * The used pointSize in pixels to render when mode is set to "Points".
     */
    pointSize?: number;
    /**
     * The Illumination Mode of the material.
     *
     * - mode 0: Constant color mode. Colors, no lightning, no shading
     * - mode 1: Diffuse lightning mode.
     *
     * @defaultValue 1
     */
    illumination?: number;

    /**
     * The opacity of the material determines how much this material dissolves into the background.
     * The value must be between 0.0 (completely transparent) and 1.0 (fully opaque).
     *
     * @defaultValue 1
     */
    opacity?: number;
}

/**
 * ModelGeometry
 */
export interface ModelGeometry {
    /**
     * Vertex positions
     */
    position: TypedArray | number[];
    /**
     * Vertex indices
     */
    index?: Uint16Array | Uint32Array | number[];
    /**
     * Vertex normals
     */
    normal?: TypedArray | number[];
    /**
     * Texture coordinates
     */
    uv?: number[];
    /**
     * Per Vertex color
     */
    color?: string | number[];
    /**
     * @hidden
     * @internal
     */
    bbox?: number[];
}

/**
 * The data format that describes the model to display.
 */
export interface ModelData {
    /**
     * The Geometries of the Model.
     */
    geometries: ModelGeometry[];

    /**
     * Textures used by Materials.
     */
    textures?: {
        [name: string]: HTMLCanvasElement | HTMLImageElement | { width: number; height: number; pixels?: Uint8Array };
    };
    /**
     * Materials referenced by {@link ModelData.faces}.
     */
    materials?: {
        [name: string]: Material;
    };
    /**
     * The Faces of the Model.
     * The winding orientation is counter-clockwise.
     */
    faces: {
        /**
         * Index of the geometry used to render the face.
         */
        geometryIndex: number;
        /**
         * The name of the Material the geometry should be rendered with.
         * If the used material is not defined in {@link ModelData.materials| Materials}, or none is defined, the default material will be used.
         */
        material: string;
        // /**
        //  * Vertex indices.
        //  * If no vertex indices are defined, "first" and "count" are used to render the face.
        //  */
        // index?: Uint16Array | Uint32Array | number[];
        /**
         * A number specifying the starting index of the vertices to render the face.
         * If "start" is defined, "index" is ignored.
         *
         * @defaultValue 0
         */
        start?: number;
        /**
         * A number specifying the number of indices of the face to be rendered.
         * If "count"  is defined, "index" is ignored.
         *
         * @defaultValue position.size/3
         */
        count?: number;
    }[];
}

/**
 * Interface for configuring the visual appearance of Models.
 * The default orientation is with the Y axis pointing up.
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
     * The Model data that should be rendered.
     * In addition to passing the model directly, a string can also be provided that references a Wavefront OBJ file.
     *
     * @example \{zIndex: 0, type: "Model", model: "./MyModel.obj"\}
     */
    model: string | ModelData;

    /**
     * Configure Face culling.
     * To enable culling set cullFace to "Front" or "Back", to disable set to false.
     * The used winding order is counter-clock-wise.
     * Face culling is disabled by default.
     *
     * @defaultValue: false
     */
    cullFace?: 'Front' | 'Back' | false;

    /**
     * Scale the model by the given vector [sx,sy,sz].
     */
    scale?: number[];
    /**
     * Translate the model by the given vector [tx,ty,tz].
     */
    translate?: number[];
    /**
     * rotate the model by the given vector [radX,radY,radZ].
     * The order of rotation is x first, then y, followed by z.
     */
    rotate?: number[];
    /**
     * 4x4 transformation matrix to transform the model.
     * if transform is defined, {@link ModelStyle.scale | scale}, {@link ModelStyle.translate | translate} and {@link ModelStyle.rotate | rotate} are ignored.
     */
    transform?: number[];

    modelId?: number;
}
