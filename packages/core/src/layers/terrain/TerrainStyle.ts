/*
 * Copyright (C) 2019-2025 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
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
import {AmbientLight, DirectionalLight, LayerStyle, Color} from '../../styles/LayerStyle';
import {Material, ModelGeometry, ModelStyle} from '../../styles/ModelStyle';
import {RuntimeLayerStyle} from '../../styles/RuntimeLayerStyle';

const DEFAULT_TERRAIN_LIGHT = [{
    type: 'ambient',
    color: 'white',
    intensity: 1.0
}];


const createTerrainModelBuilder = (material) => ({id, properties}, zoom: number, tileSize: number) => {
    const textures = {};
    const textureOptions: { uvScale: number, diffuseMap?: any, uHeightMap?: any } = {uvScale: 1};
    if (properties.texture) {
        textures[textureOptions.diffuseMap = `dm-${id}`] = properties.texture;
        textureOptions.uvScale = tileSize / properties.texture.width;
    }
    if (properties.heightMap) {
        textures[textureOptions.uHeightMap = `hm-${id}`] = {
            data: properties.heightMap
        };
    }
    return {
        id: `Terrain-${id}-${Math.random() * 1e6 ^ 0}`,
        textures,
        materials: {
            terrain: {
                diffuse: [1, 1, 1],
                useUVMapping: false,
                wrap: 'clamp',
                ...material,
                ...textureOptions
            }
        },
        faces: [{
            geometryIndex: 0,
            material: 'terrain'
        }],
        geometries: [{
            position: properties.vertices,
            index: properties.indices,
            // heightmap terrain derives normals from the heightmap in the shader, so `false`
            // skips the unnecessary CPU-side calculation and upload of vertex normals.
            normal: properties.normals || false,
            size: properties.size
            // uv: properties.uv
        } as ModelGeometry]
    };
};

/**
 * Configuration style for a 3D terrain tile layer.
 *
 * This class controls the visual appearance of terrain tiles, including vertical exaggeration,
 * lighting, material properties, and sky background color. It extends the regular processed
 * layer style so it can be used directly as both the style definition and style manager.
 *
 * It can be passed to the `style` field of {@link TerrainTileLayerOptions}.
 */
export class TerrainTileLayerStyle extends RuntimeLayerStyle {
    exaggeration: number;
    material: Material;
    setTileSize(size: number) {
    };

    /**
     * Updates the terrain material values that can be changed without rebuilding terrain buffers.
     *
     * @param materialUpdate - The live `specular` color and/or `shininess` values.
     *
     * Call `display.refresh()` after changing the material to render the new values.
     */
    setMaterial(materialUpdate: Partial<Pick<Material, 'specular' | 'shininess'>>) {
        Object.assign(this.material, materialUpdate);
    }

    colorSource?: { type: 'material' } | { type: 'solid', color: Color } | { type: 'layerBackground', layerId: string };

    /**
     * Creates a new instance of `TerrainTileLayerStyle`.
     *
     * @param style - Optional configuration object for terrain style parameters.
     */
    constructor(style: ({
        /**
         * Elevation scale multiplier applied during rendering.
         * This visually scales the terrain heights (e.g. 1 = real scale, 2 = double vertical exaggeration).
         *
         * Also known as "vertical exaggeration".
         * Has no effect on the actual height data.
         *
         * @defaultValue 1
         */
        exaggeration?: number;
        /**
         * Lights to illuminate the terrain surface.
         *
         * Can include ambient and directional lights to control shading effects.
         * If omitted, a default terrain light setup is used, which is just a simple ambient light (no directional lights).
         */
        light?: (AmbientLight | DirectionalLight)[],
        /**
         * Material properties applied to the terrain mesh.
         *
         * This defines visual attributes such as color, shading, or roughness,
         * depending on the renderer's material model.
         */
        material?: Material,
        /**
         * Defines the sky color of the map
         * {@link LayerStyle.skyColor}
         */
        skyColor?: LayerStyle['skyColor'],
        /**
         * Defines the background color of the terrain layer, shown when terrain data is not fully loaded.
         */
        backgroundColor?: LayerStyle['backgroundColor']

        /**
         * Controls how the terrain surface is colored.
         *
         * The color source defines the base color (albedo) of the terrain mesh
         * before lighting is applied.
         *
         * This property is independent of `backgroundColor`, which is only used
         * when terrain data is missing or not yet rendered.
         *
         * ### Available modes
         *
         * - `{ type: 'material' }`
         *   Uses the diffuse color defined by the terrain material.
         *   This is the default behavior.
         *
         * - `{ type: 'solid', color }`
         *   Uses a single, solid color for the entire terrain surface.
         *   Lighting is still applied, but the base color is constant.
         *
         * - `{ type: 'layerBackground', layerId }`
         *   Uses the background color of another layer as the terrain surface color.
         *   Typically used when visual data from another layer is rendered offscreen
         *   and projected onto the terrain.
         *
         *   If the referenced layer is not available or not yet rendered,
         *   its `backgroundColor` is used as a fallback.
         *
         * @defaultValue `{ type: 'material' }`
         */
        colorSource?:
            | { type: 'material' }
            | { type: 'solid', color: Color }
            | { type: 'layerBackground', layerId: string };

        /**
         * Specifies whether to display a wireframe for debugging purposes.
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
    }) = {}) {
        super();

        const lights = {};
        const material: Material = {...(style.material || {})};

        this.material = material;

        let light = 'defaultTerrainLight';
        let tileSize = 512;

        const terrainStyle = this;

        terrainStyle.exaggeration = style.exaggeration ?? 1;

        if (style.light) {
            light = 'terrainLight';
            lights[light] = style.light;
        } else {
            lights[light] = DEFAULT_TERRAIN_LIGHT;
        }

        this.setTileSize = (size: number) => {
            tileSize = size;
        };


        const terrainFeatureStyle = {
            light,
            zIndex: 0,
            type: 'Terrain',
            cullFace: 'Back',
            rotate: [Math.PI / 2, 0, 0]
        };

        const buildModel = createTerrainModelBuilder(material);

        Object.assign(this, <LayerStyle>{
            skyColor: style.skyColor || {
                'type': 'LinearGradient',
                'stops': {
                    '0.0': 'rgba(251, 251, 251, 1)',
                    '0.1': 'rgba(225, 237, 248, 1)',
                    '0.2': 'rgba(201, 223, 245, 1)',
                    '0.3': 'rgba(179, 209, 241, 1)',
                    '0.4': 'rgba(157, 195, 237, 1)',
                    '0.5': 'rgba(136, 181, 233, 1)',
                    '0.6': 'rgba(115, 167, 229, 1)',
                    '0.7': 'rgba(95, 153, 225, 1)',
                    '0.8': 'rgba(75, 138, 221, 1)',
                    '0.9': 'rgba(55, 124, 217, 1)',
                    '1.0': 'rgba(35, 110, 213, 1)'
                }
            },
            backgroundColor: style.backgroundColor || '#8c9c5a',
            lights,
            styleGroups: {
                'TerrainModelMSH': [<ModelStyle><unknown>{
                    ...terrainFeatureStyle,
                    scale({properties}) {
                        const {quantizationRange} = properties;
                        const quantizationUnit = 1 / quantizationRange;
                        const xyScale = quantizationUnit * (tileSize);
                        // const zScale = (quantizedMaxHeight - quantizedMinHeight) / quantizationRange;
                        const zScale = properties.heightScale;
                        return [xyScale, xyScale, -zScale]; // * terrainStyle.exaggeration];
                    },
                    translate({properties}) {
                        return [
                            -0.5 * tileSize,
                            properties.quantizedMinHeight,
                            -0.5 * tileSize
                        ];
                    },
                    model(feature, zoom) {
                        return buildModel(feature, zoom, tileSize);
                    }
                }],
                'TerrainModelHM': [<ModelStyle><unknown>{
                    ...terrainFeatureStyle,
                    scale({properties}) {
                        const {quantizationRange} = properties;
                        const quantizationUnit = 1 / quantizationRange;
                        const xyScale = quantizationUnit * tileSize;
                        // const zScale = (quantizedMaxHeight - quantizedMinHeight) / quantizationRange;
                        const zScale = properties.heightScale;
                        return [xyScale, xyScale, -zScale]; //  * terrainStyle.exaggeration];
                        // return [xyScale, xyScale, -1.0 * exaggeration];
                    },
                    translate() {
                        return [-0.5 * tileSize, 0.0, -0.5 * tileSize];
                    },
                    model(feature, zoom) {
                        return buildModel(feature, zoom, tileSize);
                    }
                }]
            },
            assign(feature, zoom) {
                return feature.properties.useHeightMap ? 'TerrainModelHM' : 'TerrainModelMSH';
            }
        });

        this.colorSource = style.colorSource || {type: 'material'};

        (this as LayerStyle).showWireframe = style.showWireframe;
    }
}
