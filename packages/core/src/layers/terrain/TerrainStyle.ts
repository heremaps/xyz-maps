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
import {AmbientLight, DirectionalLight, LayerStyle} from '../../styles/LayerStyle';
import {Material, ModelStyle} from '../../styles/ModelStyle';

const DEFAULT_TERRAIN_LIGHT = [{
    type: 'ambient',
    color: 'white',
    intensity: 1.0
}];


const createTerrainModelBuilder = (tileSize: number, material) => ({id, properties}, zoom: number) => {
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
            normal: properties.normals || false
            // uv: properties.uv
        }]
    };
};


/**
 * Configuration style for a 3D terrain tile layer.
 *
 * This class controls the visual appearance of terrain tiles, including vertical exaggeration,
 * lighting, material properties, and sky background color.
 *
 * It implements the {@link LayerStyle} interface and can be passed to the `style` field
 * of {@link TerrainTileLayerOptions}.
 */
export class TerrainTileLayerStyle implements LayerStyle {
    setTileSize(size: number) {
    };

    styleGroups: {};

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
    }) = {}) {
        const lights = {};
        const material = style.material || {};
        let light = 'defaultTerrainLight';
        let tileSize = 512;

        const exaggeration = style.exaggeration || 1;

        if (style.light) {
            light = 'terrainLight';
            lights[light] = style.light;
        } else {
            lights[light] = DEFAULT_TERRAIN_LIGHT;
        }

        this.setTileSize = (size: number) => {
            tileSize = size;
        };


        const terrainStyle = {
            light,
            zIndex: 0,
            type: 'Terrain',
            cullFace: 'Back',
            rotate: [Math.PI / 2, 0, 0]
        };


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
                    ...terrainStyle,
                    scale({properties}) {
                        const {quantizationRange} = properties;
                        const quantizationUnit = 1 / quantizationRange;
                        const xyScale = quantizationUnit * (tileSize);
                        // const zScale = (quantizedMaxHeight - quantizedMinHeight) / quantizationRange;
                        const zScale = properties.heightScale;
                        return [xyScale, xyScale, -zScale * exaggeration];
                    },
                    translate({properties}) {
                        return [
                            -0.5 * tileSize,
                            properties.quantizedMinHeight,
                            -0.5 * tileSize
                        ];
                    },
                    model: createTerrainModelBuilder(tileSize, material)
                }],
                'TerrainModelHM': [<ModelStyle><unknown>{
                    ...terrainStyle,
                    scale({properties}) {
                        const {quantizationRange} = properties;
                        const quantizationUnit = 1 / quantizationRange;
                        const xyScale = quantizationUnit * (tileSize);
                        // const zScale = (quantizedMaxHeight - quantizedMinHeight) / quantizationRange;
                        const zScale = properties.heightScale;
                        return [xyScale, xyScale, -zScale * exaggeration];
                        // return [xyScale, xyScale, -1.0 * exaggeration];
                    },
                    translate: [-0.5 * tileSize, 0.0, -0.5 * tileSize],
                    model: createTerrainModelBuilder(tileSize, material)
                }]
            },
            assign(feature, zoom) {
                return feature.properties.useHeightMap ? 'TerrainModelHM' : 'TerrainModelMSH';
            }
        });
    }
}
