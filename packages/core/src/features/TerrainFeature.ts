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
import {Feature} from './Feature';
import {GeoJSONCoordinate} from './GeoJSON';
import {TerrainTileProvider, TileLayer} from '@here/xyz-maps-core';


export type TerrainTileMesh = {
    vertices: Uint16Array | Uint32Array | Float32Array;
    indices: Uint16Array | Uint32Array;
    normals?: Int8Array | Int16Array | Float32Array;
    edgeIndices?: {
        left: Uint16Array | Uint32Array;
        right: Uint16Array | Uint32Array;
        top: Uint16Array | Uint32Array;
        bottom: Uint16Array | Uint32Array;
    }
}


/**
 * The Properties of a Terrain Tile feature.
 */
export type TerrainTileFeatureProperties = TerrainTileMesh & {
    /**
     * Indicates if the feature is a terrain tile.
     */
    readonly isTerrain: true;
    /**
     * Additional custom properties of the terrain feature.
     */
    [name: string]: any;
}

/**
 * This Feature represents a Terrain Tile.
 */
export class TerrainTileFeature extends Feature<'Polygon'> {
    _provider: TerrainTileProvider;

    /**
     * The Properties of the Terrain Tile feature.
     */
    properties: TerrainTileFeatureProperties;

    /**
     * The geometry of a cluster feature is of type 'Polygon',
     * where the `coordinates` represent the geographical bounding box of the tile.
     */
    geometry: {
        type: 'Polygon',
        coordinates: GeoJSONCoordinate[][]
    };


    /**
     * @hidden
     * @internal
     *
     * Returns the height map array for the terrain tile.
     * The height map contains elevation data for each point in the tile.
     *
     * @returns {Uint16Array | Uint32Array | Float32Array | null}
     *          The height map array, or null if not available.
     */
    getHeightMap(): Uint16Array | Uint32Array | Float32Array | null {
        return this.properties.heightMap || null;
    }

    /**
     * @hidden
     * @internal
     *
     * Returns the height value from the height map at the given normalized local tile coordinates.
     *
     * @param normalizedX - The normalized X coordinate (0.0 to 1.0).
     * @param nomralizedY - The normalized Y coordinate (0.0 to 1.0).
     *
     * @returns The height value at the specified coordinates, or null if no height map is available.
     */
    getHeightAt(normalizedX: number, nomralizedY: number, interpolate?: boolean = false) {
        const heightMap = this.getHeightMap();
        if (!heightMap) return null;
        const size = Math.sqrt(heightMap.length);
        const x = Math.floor(normalizedX * size);
        const y = Math.floor(nomralizedY * size);
        return heightMap[y * size + x];
    }
}
