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

import {Tile} from '../../tile/Tile';
import LRUStorage from '../../storage/LRUStorage';
import LoaderManager from '../../loaders/Manager';
import {HTTPLoader} from '../../loaders/HTTPLoader';
import {ConcurrentTileLoader} from '../../loaders/ConcurrentTileLoader';
import TerrainWorkerLoader, {TerrainTileLoaderOptions, TerrainImageryLoaderOptions} from './TerrainWorkerLoader';
import {RemoteTileProvider} from '../RemoteTileProvider/RemoteTileProvider';
import {RemoteTileProviderOptions} from '../RemoteTileProvider/RemoteTileProviderOptions';
import {tileXYToQuadKey} from '../../tile/TileUtils';
import {TileLoadDelegator} from '../RemoteTileProvider/TileLoadDelegator';
import {getOppositeNeighbor, Neighbor, stitchMeshBorders} from './terrainUtils';
import {stitchHeightmapBorders} from './heightmapUtils';
import {TerrainTileFeature} from '../../features/TerrainFeature';
import {StyleZoomRange} from '../../styles/LayerStyle';

import {DataSourceAttribution} from '../../layers/DataSourceAttribution';


type TerrainTileProviderOptions = Omit<RemoteTileProviderOptions, 'level'> & {
    terrain?: TerrainTileLoaderOptions;
    maxGeometricError?: StyleZoomRange<number> | number;
    imagery?: TerrainImageryLoaderOptions;
    loader?: any;
}


const createGeometricErrorMap = (maxGeometricError: number | StyleZoomRange<number>) => {
    if (typeof maxGeometricError == 'number') {
        maxGeometricError = Object.fromEntries(
            Array.from({length: 30}, (_, i) => [i, maxGeometricError as number])
        );
    }
    return maxGeometricError;
};


export class TerrainTileProvider extends RemoteTileProvider {
    dataType = 'json';

    Feature = TerrainTileFeature;
    private _hmPadding: number; // heightmap padding for edge stitching

    private maxGeometricError: { [zoom: number]: number };

    constructor(options: TerrainTileProviderOptions) {
        options ||= {};

        const attribution: (DataSourceAttribution | string)[] = [];
        const maxGeometricError = createGeometricErrorMap(options.maxGeometricError);
        const heightMapPadding = (options.terrain?.heightMapPadding ?? 1) ^ 0;

        const addAttribution = (attr: string | DataSourceAttribution | DataSourceAttribution[]) => {
            if (attr) {
                attribution.push(...(Array.isArray(attr) ? attr : [attr]));
            }
        };

        addAttribution(options.attribution);


        let terrainWorkderLoader;

        if (!options.loader) {
            const tileLoadersConfig = {};
            for (let key of ['terrain', 'imagery']) {
                const loaderOptions = options[key];
                if (loaderOptions) {
                    let additionalLoaderOptions;
                    let Loader;
                    if (key == 'terrain') {
                        Loader = TerrainWorkerLoader;
                        additionalLoaderOptions = {maxGeometricError, heightMapPadding};
                    } else {
                        Loader = HTTPLoader;
                        additionalLoaderOptions = {};
                    }
                    tileLoadersConfig[key] = new Loader({
                        headers: {
                            'Accept': '*/*',
                            ...loaderOptions.headers
                        },
                        ...loaderOptions,
                        ...additionalLoaderOptions
                    });
                    if (key == 'terrain') {
                        terrainWorkderLoader = tileLoadersConfig[key];
                    }
                    addAttribution(loaderOptions.attribution);
                }
            }

            options.loader = new LoaderManager(
                new ConcurrentTileLoader(tileLoadersConfig)
            );
        }

        super(Object.assign(options, {
            level: 0,
            storage: new LRUStorage(512),
            clipped: true,
            attribution
        }));

        const provider = this;

        this._hmPadding = heightMapPadding;

        this.remoteTileLoader = new TileLoadDelegator({
            provider,
            loader: options.loader,
            preProcessor: this.preProcessor.bind(this),
            processTileResponse: (tile, data, onDone) => {
                // Treat missing or empty responses as unavailable;
                if (!data?.length) {
                    tile.dataUnavailable = true;
                    return onDone(null);
                }
                tile.dataUnavailable = false;
                provider.insertTileData(tile, data, onDone);
            }
        });
    }

    getTile(quadkey: string, cb: (tile: Tile) => void): any {
        const tile = super.getTile(quadkey, cb);
        return tile;
    }

    preProcessor(processedData: {
        data: { terrain: TerrainTileFeature, imagery?: ImageData },
        tile: { x: number, y: number, z: number, quadkey: string }
    }): TerrainTileFeature[] {
        const {data, tile} = processedData;
        const feature = data.terrain;

        if (feature) {
            const {properties} = feature;
            if (data.imagery) {
                properties.texture = data.imagery;
            }
            let {heightMap} = properties;

            const updatedNeighborTiles : Tile[] = [];
            for (let side of [Neighbor.RIGHT, Neighbor.BOTTOM, Neighbor.LEFT, Neighbor.TOP]) {
                // let [dx, dy] = side;
                const dx = side === Neighbor.RIGHT ? 1 : side === Neighbor.LEFT ? -1 : 0;
                const dy = side === Neighbor.BOTTOM ? 1 : side === Neighbor.TOP ? -1 : 0;
                // let dx = side % 2 ? side - 1 : 0; // -1 left, +1 right
                // let dy = side % 2 != 0 ? side - 2 : 0; // -1 top, +1 bottom

                const neighborTile = this.getCachedTile(tileXYToQuadKey(tile.z, tile.y + dy, tile.x + dx));
                if (neighborTile?.isLoaded()) {
                    const neighborTerrain = neighborTile.data?.[0];
                    if (!neighborTerrain) continue;

                    const neighborProperties = neighborTerrain.properties;
                    const oppositeSide = getOppositeNeighbor(side);

                    if (properties.useHeightMap) {
                        const neighborHeightMap = neighborProperties.heightMap;
                        const padding = this._hmPadding;
                        const heightMapSize = heightMap && Math.sqrt(heightMap.length);
                        const neighborHeightMapSize = neighborHeightMap && Math.sqrt(neighborHeightMap.length);

                        // The last logical row/column is extrapolated by decodeHeights() to reach a
                        // 2^n+1 grid, but it is the same point as the neighbor's measured index 0 —
                        // hence the right/bottom tile owns the shared edge, regardless of load order.
                        // The padding ring then takes the neighbor's interior samples so the shader's
                        // central differences get a full step across the border instead of a half one.
                        // padding === 1 only: extendHeightMapWithFullClamping() hardcodes a 1px ring.
                        if (padding === 1 && neighborProperties.useHeightMap && heightMap && neighborHeightMap &&
                            Number.isInteger(heightMapSize) && heightMapSize === neighborHeightMapSize) {
                            updatedNeighborTiles.push(neighborTile);

                            if (side === Neighbor.RIGHT || side === Neighbor.BOTTOM) {
                                stitchHeightmapBorders(neighborHeightMap, heightMap, oppositeSide, padding, 0, padding + 1);
                                stitchHeightmapBorders(heightMap, neighborHeightMap, side, padding + 1, 0, padding);
                            } else {
                                stitchHeightmapBorders(heightMap, neighborHeightMap, side, padding, 0, padding + 1);
                                stitchHeightmapBorders(neighborHeightMap, heightMap, oppositeSide, padding + 1, 0, padding);
                            }
                        }
                    } else {
                        updatedNeighborTiles.push(neighborTile);
                        if (side === Neighbor.RIGHT || side === Neighbor.BOTTOM) {
                            stitchMeshBorders(side, properties, neighborProperties);
                        } else {
                            stitchMeshBorders(oppositeSide, neighborProperties, properties);
                        }
                    }
                }
            }

            if (updatedNeighborTiles.length) {
                // trigger refresh
                this.dispatchEvent('featuresAdd', {tiles: updatedNeighborTiles, features: []}, false);
            }
        }

        // feature.bbox = calcBBox(feature);
        // const tile = res.provider.getCachedTile(res.quadkey);
        // feature.bbox = [...tile.bounds];
        return feature ? [feature] : [];
    }

    getHeightmapPadding() {
        return this._hmPadding;
    }
}


TerrainTileProvider.prototype.__type = 'TINProvider';
