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

import {HTTPWorker} from '../../loaders/webworker/HTTPWorker';
import {getGeoBounds, tileXYToQuadKey} from '../../tile/TileUtils';
import {TransferableCollector} from './TransferableCollector';
import {RTINMeshBuilder, RTINMesh} from './RTINMeshBuilder';
import {quantizeVertexData, computeEdgeIndices, computeMeshNormals} from './terrainUtils';
import {extendHeightMapWithFullClamping, decodeHeights} from './heightmapUtils';
import {TerrainTileFeature} from '../../features/TerrainFeature';
import {XYZTerra} from './XYZTerra';
import {TerrainTileLoaderOptions} from './TerrainWorkerLoader';
import {StyleZoomRange} from '../../styles/LayerStyle';
import {GeoJSONFeature} from '../../features/GeoJSON';

declare const self: Worker;

const QUANTIZED_RANGE = 0xffff;
const QUANTIZED_MIN_HEIGHT = -500;
const QUANTIZED_MAX_HEIGHT = 9000;

type QuantizeOptions = {
    quantizedRange?: number,
    quantizedMinHeight?: number,
    quantizedMaxHeight?: number
};


export const createTerrainTile = (
    x: number, y: number, z: number,
    indices: ArrayLike<number>,
    vertices: ArrayLike<number>,
    normals?: Float32Array | Int16Array | Int8Array,
    quantizeOptions?: QuantizeOptions
) => {
    const feature = createTerrainFeature(x, y, z, indices, vertices);

    if (normals) {
        feature.properties.normals = normals;
    }
    return prepareFeature(feature, null, null, quantizeOptions);
};
const createTerrainFeature = (
    x: number, y: number, z: number,
    indices: ArrayLike<number>,
    vertices: ArrayLike<number>,
    sourceFormat: string = 'binary'
): GeoJSONFeature => {
    let quadkey = tileXYToQuadKey(z, y, x);
    const bounds = getGeoBounds(z, y, x);
    const [minLon, minLat, maxLon, maxLat] = bounds;

    return {
        id: quadkey,
        type: 'Feature',
        properties: {
            isTerrain: true,
            source: {
                type: sourceFormat
            },
            indices,
            vertices
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [minLon, maxLat],
                [maxLon, maxLat],
                [maxLon, minLat],
                [minLon, minLat],
                [minLon, maxLat]
            ]]
        }
    };
};

const terrainFactories = {
    stride: 3,
    meshBuilder: {},
    get(size: number): RTINMeshBuilder {
        return this.meshBuilder[size] ||= new RTINMeshBuilder(size, this.stride);
    }
};

const clampHeightmap = (heights: Float32Array, minVal: number, maxVal: number) => {
    for (let i = 0; i < heights.length; i++) {
        heights[i] = Math.max(minVal, Math.min(maxVal, heights[i]));
    }
};

const createMeshFromHeightMap = (heightMap: ArrayLike<number>, maxError: number = 1): RTINMesh => {
    const heightMapSize = Math.sqrt(heightMap.length);

    clampHeightmap(heightMap as Float32Array, QUANTIZED_MIN_HEIGHT, QUANTIZED_MAX_HEIGHT);

    const meshBuilder = terrainFactories.get(heightMapSize);
    const mesh = meshBuilder.triangulate(heightMap, {
        maxError,
        enableSkirts: true,
        maxEdgeDetails: false
    });

    return mesh;
};

function createHeightmapTerrainFeature(x: number, y: number, z: number, mesh: RTINMesh, heightMap) {
    const heightMapSize = Math.sqrt(heightMap.length);
    const tileSize = heightMapSize % 2 == 0 ? heightMapSize : heightMapSize - 1;
    const quantizedHeightRange = QUANTIZED_MAX_HEIGHT - QUANTIZED_MIN_HEIGHT;

    return createTerrainFeature(x, y, z,
        mesh.indices as Uint16Array | Uint32Array,
        quantizeVertexData(
            mesh.vertices,
            QUANTIZED_RANGE / tileSize,
            (h) => (h - QUANTIZED_MIN_HEIGHT) * QUANTIZED_RANGE / quantizedHeightRange,
            mesh.stride !== 3 && heightMap
        ) as Float32Array,
        'terrarium'
    );
}

function prepareFeature(feature,
    heightMap?: Float32Array,
    skirtToMainVertexMap?: Map<number, number>,
    quantizeOptions?: QuantizeOptions
): TerrainTileFeature {
    if (feature) {
        const {properties} = feature;

        if (Array.isArray(properties.indices)) {
            const max = properties.indices.reduce((a, b) => Math.max(a, b), -Infinity);
            properties.indices = new (max > 65535 ? Uint32Array : Uint16Array)(properties.indices);
        }
        if (Array.isArray(properties.vertices)) {
            properties.vertices = new Uint16Array(properties.vertices);
        }

        quantizeOptions ||= {};
        const quantizedRange = quantizeOptions.quantizedRange ?? QUANTIZED_RANGE;
        const quantizedMinHeight = quantizeOptions.quantizedMinHeight ?? QUANTIZED_MIN_HEIGHT;
        const quantizedMaxHeight = quantizeOptions.quantizedMaxHeight ?? QUANTIZED_MAX_HEIGHT;
        const quantizedHeightRange = quantizedMaxHeight - quantizedMinHeight;
        const srcNormalizeScale = properties.source.normalizeScale ||= 1 / (Math.pow(2, properties.vertices.BYTES_PER_ELEMENT * 8) - 1);
        properties.normalizeScale ??= {
            x: srcNormalizeScale,
            y: srcNormalizeScale,
            z: srcNormalizeScale * quantizedHeightRange
        };
        properties.quantizationRange ??= quantizedRange;
        properties.quantizedMinHeight ??= quantizedMinHeight;
        properties.quantizedMaxHeight ??= quantizedMaxHeight;
        properties.quantizationStep ??= quantizedHeightRange / quantizedRange;
        properties.heightScale ??= (quantizedMaxHeight - quantizedMinHeight) / quantizedRange;

        // properties.normalMap = computeNormals(heightMap);

        if (heightMap) {
            properties.heightMap = extendHeightMapWithFullClamping(heightMap);
        }
        // else {
        properties.normals ||= computeMeshNormals(properties.vertices, properties.indices, skirtToMainVertexMap);
        // }

        if (skirtToMainVertexMap) {
            for (const [i, j] of skirtToMainVertexMap) {
                const i3 = i * 3;
                const j3 = j * 3;
                properties.normals[i3] = properties.normals[j3];
                properties.normals[i3 + 1] = properties.normals[j3 + 1];
                properties.normals[i3 + 2] = properties.normals[j3 + 2];
            }
        }

        properties.edgeIndices ||= computeEdgeIndices(
            properties.vertices,
            3,
            properties.indices.constructor as typeof Uint16Array,
            QUANTIZED_RANGE,
            skirtToMainVertexMap
        );
    }
    return feature;
}

const getImageDataFromImageBitmap = (imageBitmap: ImageBitmap): ImageData => {
    const offscreenCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = offscreenCanvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0);
    return ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
};

class TerrainWorker extends HTTPWorker {
    private encoding: string;

    private decodeScale: number;
    private decodeOffset: number;
    private maxGeometricError: StyleZoomRange<number>;

    constructor(options: TerrainTileLoaderOptions = {}) {
        options = {responseType: 'json', ...options};
        super(options);
        this.encoding = options.encoding || 'terrarium';
        this.decodeScale = options.heightScale ?? 1;
        this.decodeOffset = options.heightOffset ?? 0;
        this.maxGeometricError = options.maxGeometricError;
    }

    process(data: any, x: number, y: number, z: number): {
        data: TerrainTileFeature,
        transfer: any[]
    } {
        const transfer = new TransferableCollector();
        let feature;
        let skirtToMainVertexMap: Map<number, number>;
        const encoding = this.encoding;
        let heightMap = null;

        if (data instanceof ArrayBuffer) {
            const {indices, vertices} = XYZTerra.decode(data);
            feature = createTerrainFeature(x, y, z, indices as Uint16Array | Uint32Array, vertices as Float32Array, encoding);
            data = [feature];
        } else {
            if (data instanceof ImageBitmap) {
                heightMap = decodeHeights(
                    getImageDataFromImageBitmap(data),
                    encoding,
                    'extrapolate', // 'backfill',
                    this.decodeScale,
                    this.decodeOffset
                );

                const mesh: RTINMesh = createMeshFromHeightMap(heightMap, this.maxGeometricError[z]);
                skirtToMainVertexMap = mesh.skirtToMainVertexMap;
                data = createHeightmapTerrainFeature(x, y, z, mesh, heightMap);
                heightMap = null;
            }
            feature = data.type == 'Feature' ? data : data.features[0];
        }

        if (feature) {
            prepareFeature(feature, heightMap, skirtToMainVertexMap);

            // properties.uv = (function createUVs(
            //  vertices: Float64Array | Float32Array | Uint16Array | Int16Array | number[],
            //  extentX: number,
            //  extentY: number
            //  ) {
            //     const {length} = vertices;
            //     const uv = new Float32Array(length / 3 * 2);
            //     for (let i = 0, j = 0; i < length; i += 3) {
            //         uv[j++] = vertices[i] / extentX;
            //         uv[j++] = 1 - vertices[i + 1] / extentY;
            //     }
            //     return uv;
            // })(properties.vertices, QUANTIZED_RANGE, QUANTIZED_RANGE);

            transfer.add(feature.properties);
        }
        return {data, transfer: transfer.getTransferables()};
    }
}

export default {
    id: 'TerrainWorker',
    Worker: TerrainWorker
};
