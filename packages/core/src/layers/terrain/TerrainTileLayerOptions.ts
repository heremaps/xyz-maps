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
import {TileLayerOptions} from '../TileLayerOptions';
import {LayerStyle, StyleZoomRange} from '../../styles/LayerStyle';
import {TerrainTileLayerStyle} from './TerrainStyle';
import {DataSourceAttribution} from '../DataSourceAttribution';


/**
 * Default values for maxGeometricError (in meters) per zoom level.
 * These values define the maximum allowed geometric error when converting raster heightmaps to meshes.
 *
 * @hidden
 * @internal
 */
export const defaultMaxGeometricError: { [zoom: number]: number } = {
    0: 5000,
    1: 2500,
    2: 1300,
    3: 700,
    4: 400,
    5: 200,
    6: 100,
    7: 50,
    8: 25,
    9: 12,
    10: 6,
    11: 3,
    12: 1.5,
    13: 0.8,
    14: 0.4,
    15: 0.2,
    16: 0.1,
    17: 0.05,
    18: 0.025,
    19: 0.0125,
    20: 0.00625
};

/**
 * Represents a decoded terrain mesh used for rendering elevation data.
 *
 * This structure contains the raw vertex and index buffers necessary
 * to construct a 3D surface mesh, as well as optional per-vertex normals.
 */
export interface TerrainMesh {
    /**
     * Flat array of vertex positions in 3D space.
     * The array is structured as [x0, y0, z0, x1, y1, z1, ..., xn, yn, zn].
     *
     * Coordinate units:
     * - x/y are in tile-local pixel space (typically 0 to tileSize, e.g., 0–256)
     * - z is in meters above sea level (or relative to a defined datum)
     */
    vertices: Float32Array;
    /**
     * Triangle indices defining the mesh connectivity.
     * Each group of three indices forms a triangle, referencing the `vertices` array.
     *
     * Use Uint16Array if the number of vertices is ≤ 65535, otherwise Uint32Array.
     */
    indices: Uint16Array | Uint32Array;
    /**
     * Optional flat array of per-vertex normals for lighting and shading.
     * The array is structured as [nx0, ny0, nz0, nx1, ny1, nz1, ..., nxn, nyn, nzn].
     *
     * If not provided, normals can be computed from geometry or defaulted.
     */
    normals?: Float32Array;
}


/**
 * Configuration options for a TerrainTileLayer.
 *
 * A TerrainTileLayer is capable of rendering elevation-based 3D terrain using
 * different kinds of input data:
 *
 * 1. **Raster heightmaps**: Typically encoded grayscale images or DEM tiles.
 *    These are decoded and triangulated client-side into 3D meshes.
 *
 * 2. **Pre-triangulated terrain meshes**: Binary or JSON tile formats (e.g., quantized meshes)
 *    where the geometry is already prepared and only needs to be rendered.
 *
 * The layer can optionally render an imagery overlay (such as satellite imagery)
 * on top of the terrain surface.
 */
export interface TerrainTileLayerOptions extends TileLayerOptions {
    /**
     * Options to configure the remote elevation (DEM) data source.
     *
     * This layer supports two types of elevation input:
     * 1. Raster-based heightmaps (e.g. Terrain-RGB or Terrarium tiles)
     * 2. Precomputed terrain meshes (e.g. via RTIN or quantized meshes)
     *
     * Raster heightmaps are decoded into elevation values and triangulated into meshes at runtime.
     * Mesh-based sources can directly deliver ready-to-render geometry per tile.
     */
    elevation: {
        /**
         * Tile URL template or resolver function for fetching elevation tiles.
         *
         * The URL can be a string template (e.g. "https://example.com/tiles/{z}/{x}/{y}.png")
         * or a function that dynamically generates the URL per tile.
         *
         * For raster-based elevation data input, the URL points to an image (PNG/WEBP) tiles.
         * For mesh input, the URL should return binary or structured mesh data (e.g. JSON, protobuf).
         */
        url: string | ((z: number, y: number, x: number, quadkey: string) => string); /**
         /**
         * Encoding format of the elevation tiles.
         *
         * For raster-based input, this specifies how elevation values are encoded in image tiles,
         * and determines how they are decoded into height values.
         *
         * For mesh-based input, this indicates the format or protocol used
         * to decode the mesh data (e.g. binary layout, vertex structure, compression).
         *
         * Supported raster encodings:
         * - `'terrarium'`: 8-bit PNG using RGB values (Mapzen/Leaflet-style)
         * - `'mtk'`: Maptoolkit format (raster heightmap)
         * - `'mapboxrgb'`: RGB-based encoding (Mapbox Terrain-RGB)
         * - 'custom-raster': Use a custom decodeHeight function to extract elevation from raster tiles
         *
         * Supported mesh encodings:
         * - `'xyztrn'`: binary terrain mesh format (XYZ Terrain)
         * - 'custom-mesh': Use a custom decodeMesh function to process mesh-based elevation tiles
         *
         * This field is optional for mesh input if decoding is handled externally.
         */
        encoding?: 'terrarium' | 'mtk' | 'xyztrn' | 'mapboxrgb' | 'custom-raster' | 'custom-mesh';
        /**
         * Attribution for the elevation data source.
         *
         * Can be a string, a single DataSourceAttribution object, or an array of DataSourceAttribution objects.
         * This is used to provide proper credit or licensing information for the elevation tiles.
         *
         * @see {@link TileLayerOptions.attribution}
         */
        attribution?: string | DataSourceAttribution | DataSourceAttribution[];

        // /**
        //  * Minimum zoom level for which elevation tiles are available. Default is 1.
        //  */
        // min?: number;
        // /**
        //  * Maximum zoom level for elevation tile requests. Default is 15.
        //  */
        // max?: number;
        /**
         * Constant offset to apply to decoded elevation values (in meters).
         * Used with `scale` when no custom `decodeHeight` or `decodeMesh` is provided.
         */
        offset?: number;
        /**
         * Scale factor applied to decoded elevation values (in meters).
         * Used with `offset` when no custom `decodeHeight` or `decodeMesh` is provided.
         */
        scale?: number;
        /**
         * Optional function to decode a single elevation value from pixel RGB(A).
         * Only applies to raster heightmap sources.
         * Required for custom raster encodings (if `encoding` is not set).
         *
         * Parameters:
         * - `r`, `g`, `b`, `a`: individual color channels from a tile pixel
         * Returns:
         * - Elevation value in meters
         */
        decodeHeight?: (r: number, g: number, b: number, a?: number) => number;
        /**
         * Optional decode function for custom mesh-based elevation tiles.
         * Required for custom mesh encodings (if `encoding` is not set).
         * This function is expected to parse the raw binary or structured response data (e.g., ArrayBuffer, JSON) into a terrain mesh.
         *
         * The `responseType` must be explicitly set when using `decodeMesh` to indicate the format of the incoming tile data.
         *
         * The returned object must be of type `TerrainMesh`:
         * {
         *   vertices: Float32Array; // flat array of XYZ positions (x0, y0, z0, x1, y1, z1, ...)
         *   indices: Uint16Array | Uint32Array; // triangle indices
         *   normals?: Float32Array; // optional flat array of vertex normals
         * }
         *
         * @param data - The raw response body (typically ArrayBuffer or parsed JSON).
         * @param responseType - The HTTP response type used when fetching the tile (e.g., "arraybuffer", "json").
         * @returns A TerrainMesh object representing the decoded geometry.
         */
        decodeMesh?: (data: ArrayBuffer | any, responseType?: string) => TerrainMesh;
        /**
         * Optional response type hint for custom encodings.
         * Used to determine how the raw tile response is handled before decoding.
         * Required when using `decodeMesh` to specify the format of the tile response (e.g. 'arraybuffer', 'json').
         *
         * This setting allows the decoding pipeline to prepare the expected format from the fetch response.
         *
         * Supported values:
         * - 'arraybuffer' – fetches raw binary data (recommended for mesh formats or custom binary heightmaps)
         * - 'json' – parses response as JSON
         * - 'blob' – returns a Blob object (useful for passing to createImageBitmap)
         * - 'text' – returns plain text (e.g., CSV or XML)
         * - 'image' – returns an HTMLImageElement or ImageBitmap (for direct raster decoding)
         */
        responseType?: 'arraybuffer' | 'json' | 'blob' | 'text' | 'image';
    };
    /**
     * Optional imagery source to be used as a texture overlay on the terrain.
     * This can enhance visual detail by projecting raster tiles (e.g., satellite imagery)
     * over the elevation surface for a more realistic and visually rich 3D map.
     */
    imagery?: {
        /**
         * Tile URL template or a function returning the tile URL.
         * If a string is provided, it can contain placeholders: {z}, {x}, {y}, or {quadkey}.
         * If a function is provided, it receives the tile coordinates and should return the URL string.
         *
         * Examples:
         * - Template string: "https://tiles.example.com/{z}/{x}/{y}.png"
         * - Function: (z, y, x, quadkey) => `https://.../${quadkey}.jpg`
         *
         * This is typically used to fetch satellite imagery, orthophotos, or custom raster tiles.
         */
        url: string | ((z: number, y: number, x: number, quadkey: string) => string);

        /**
         * Attribution for the imagery data source.
         *
         * Can be a string, a single DataSourceAttribution object, or an array of such objects.
         * This is used to provide proper credit or licensing information for the imagery tiles,
         * similar to how TileLayerOptions.attribution works.
         *
         * @see {@link TileLayerOptions.attribution}
         */
        attribution?: string | DataSourceAttribution | DataSourceAttribution[];
        // /**
        //  * Opacity of the imagery layer (default: 1.0).
        //  * A value between 0 (fully transparent) and 1 (fully opaque).
        //  * Useful for blending the imagery with the terrain color or other layers.
        //  */
        // opacity?: number;
        //
        // /**
        //  * Minimum zoom level at which imagery should be displayed.
        //  * Imagery tiles will not be loaded below this zoom level.
        //  */
        // min?: number;
        //
        // /**
        //  * Maximum zoom level at which imagery should be displayed.
        //  * Imagery tiles will not be loaded above this zoom level.
        //  */
        // max?: number;
    };
    /**
     * Controls the mesh simplification accuracy when converting raster heightmaps to terrain meshes.
     *
     * Specifies the maximum allowed geometric error (in meters) between the original heightmap and the generated mesh.
     *
     * Can be:
     * - a single number (applied globally to all zoom levels), or
     * - a zoom-indexed map: { [zoom: number]: number }
     *
     * This only applies when using raster elevation input.
     *
     * @defaultValue {
     *     0: 5000,
     *     1: 2500,
     *     2: 1300,
     *     3: 700,
     *     4: 400,
     *     5: 200,
     *     6: 100,
     *     7: 50,
     *     8: 25,
     *     9: 12,
     *     10: 6,
     *     11: 3,
     *     12: 1.5,
     *     13: 0.8,
     *     14: 0.4,
     *     15: 0.2,
     *     16: 0.1,
     *     17: 0.05,
     *     18: 0.025,
     *     19: 0.0125,
     *     20: 0.00625
     * }
     */
    maxGeometricError?: number | StyleZoomRange<number>;
    /**
     * Whether to enable pointer interactions (e.g. hover/pick)
     * @defaultValue false
     */
    pointerEvents?: boolean;

    /**
     * Optional style configuration for the terrain layer.
     */
    style?: TerrainTileLayerStyle | LayerStyle;
}
