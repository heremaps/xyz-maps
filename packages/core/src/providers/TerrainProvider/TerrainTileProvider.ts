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

export class TerrainTileProvider extends RemoteTileProvider {
    dataType = 'json';

    constructor(options: TerrainTileProviderOptions) {
        options ||= {};

        const attribution: (DataSourceAttribution|string)[] = [];
        let {maxGeometricError} = options;

        if (typeof maxGeometricError == 'number') {
            maxGeometricError = Object.fromEntries(
                Array.from({length: 30}, (_, i) => [i, maxGeometricError as number])
            );
        }

        const addAttribution = (attr: string | DataSourceAttribution | DataSourceAttribution[]) => {
            if (attr) {
                attribution.push(...(Array.isArray(attr) ? attr : [attr]));
            }
        };

        addAttribution(options.attribution);

        if (!options.loader) {
            const tileLoadersConfig = {};
            for (let key of ['terrain', 'imagery']) {
                const loaderOptions = options[key];
                if (loaderOptions) {
                    const Loader = key == 'terrain' ? TerrainWorkerLoader : HTTPLoader;
                    tileLoadersConfig[key] = new Loader({
                        headers: {
                            'Accept': '*/*',
                            ...loaderOptions.headers
                        },
                        ...loaderOptions,
                        maxGeometricError
                    });
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

        this.remoteTileLoader = new TileLoadDelegator({
            provider,
            loader: options.loader,
            preProcessor: this.preProcessor.bind(this),
            processTileResponse: (tile, data, onDone) => {
                if (tile.error) {
                    return onDone(tile.data);
                }
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

            const {heightMap} = properties;
            const updatedTiles = [];
            for (let side of [Neighbor.RIGHT, Neighbor.BOTTOM, Neighbor.LEFT, Neighbor.TOP]) {
                // let [dx, dy] = side;
                const dx = side === Neighbor.RIGHT ? 1 : side === Neighbor.LEFT ? -1 : 0;
                const dy = side === Neighbor.BOTTOM ? 1 : side === Neighbor.TOP ? -1 : 0;
                // let dx = side % 2 ? side - 1 : 0; // -1 left, +1 right
                // let dy = side % 2 != 0 ? side - 2 : 0; // -1 top, +1 bottom

                const neighborTile = this.getCachedTile(tileXYToQuadKey(tile.z, tile.y + dy, tile.x + dx));
                if (neighborTile?.isLoaded()) {
                    const neighborProperties = neighborTile.data[0].properties;
                    const oppositeSide = getOppositeNeighbor(side);
                    updatedTiles.push(neighborTile);

                    if (heightMap) {
                        const neighborHeightMap = neighborProperties.heightMap;
                        if (side === Neighbor.RIGHT || side === Neighbor.BOTTOM) {
                            stitchHeightmapBorders(heightMap, neighborHeightMap, side, 1, 2);
                            stitchHeightmapBorders(neighborHeightMap, heightMap, oppositeSide, 2, 1);
                        } else {
                            stitchHeightmapBorders(neighborHeightMap, heightMap, oppositeSide, 1, 2);
                            stitchHeightmapBorders(heightMap, neighborHeightMap, side, 2, 1);
                        }
                    } else {
                        if (side === Neighbor.RIGHT || side === Neighbor.BOTTOM) {
                            stitchMeshBorders(side, properties, neighborProperties);
                        } else {
                            stitchMeshBorders(oppositeSide, neighborProperties, properties);
                        }
                    }
                }
            }

            if (updatedTiles.length) {
                // trigger refresh
                this.dispatchEvent('featuresAdd', {tiles: updatedTiles, features: []}, false);
            }
        }

        // feature.bbox = calcBBox(feature);
        // const tile = res.provider.getCachedTile(res.quadkey);
        // feature.bbox = [...tile.bounds];
        return [feature];
    }
}


TerrainTileProvider.prototype.__type = 'TINProvider';
