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


function printHeightMap(heightMap, padding = 1) {
    padding *= 2;
    const backfill = 1;
    const tileSize = Math.sqrt(heightMap.length) - backfill - padding; // z.B. 512
    if (tileSize>33) return;

    const endXY = padding ? tileSize+1 : tileSize;

    const size = tileSize + backfill + padding; // z.B. 515
    for (let y = 0; y < size; y++) {
        let row = '';
        for (let x = 0; x < size; x++) {
            let val = heightMap[y * size + x];
            let color = '\x1b[37m'; // weiß
            // console.log(x, size, tileSize);
            // Padding: äußerste Reihen/Spalten
            if ( padding>0 && (x === 0 || y === 0 || x === size - 1 || y === size - 1)) {
                color = '\x1b[36m'; // cyan;
            } else if (x === endXY || y === endXY) {
                // Backfill: die letzte Tile-Reihe/Spalte vor dem Padding
                color = '\x1b[33m'; // gelb
            }

            row += color + Math.round(val).toString().padStart(5, ' ') + '\x1b[0m' + ' ';
        }
        console.log(row);
    }
};


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
        const heightMapPadding = options.terrain?.heightMapPadding ^ 0;
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
            let {heightMap} = properties;

            const updatedTiles = [];
            for (let side of [Neighbor.RIGHT, Neighbor.BOTTOM, Neighbor.LEFT, Neighbor.TOP]) {
                // let [dx, dy] = side;
                const dx = side === Neighbor.RIGHT ? 1 : side === Neighbor.LEFT ? -1 : 0;
                const dy = side === Neighbor.BOTTOM ? 1 : side === Neighbor.TOP ? -1 : 0;
                // let dx = side % 2 ? side - 1 : 0; // -1 left, +1 right
                // let dy = side % 2 != 0 ? side - 2 : 0; // -1 top, +1 bottom

                const neighborTile = this.getCachedTile(tileXYToQuadKey(tile.z, tile.y + dy, tile.x + dx));
                if (neighborTile?.isLoaded()) {
                    const neighborTerrain = neighborTile.data[0];
                    if (!neighborTerrain) continue;

                    const neighborProperties = neighborTerrain.properties;
                    const oppositeSide = getOppositeNeighbor(side);


                    if (properties.useHeightMap && this._hmPadding > 0 ) {
                        // const neighborHeightMap = neighborProperties.heightMap;
                        // edge padding for lighting calculation
                        // stitchHeightmapBorders(neighborHeightMap, heightMap, oppositeSide, 0, 0, 1);
                        // stitchHeightmapBorders(heightMap, neighborHeightMap, side, 0, 0, 1);

                        // if (side === Neighbor.RIGHT || side === Neighbor.BOTTOM) {
                        //     stitchHeightmapBorders(neighborHeightMap, heightMap, oppositeSide, 1, 0, 2);
                        //     stitchHeightmapBorders(heightMap, neighborHeightMap, side, 2, 0, 1);
                        // } else {
                        //     stitchHeightmapBorders(heightMap, neighborHeightMap, side, 1, 0, 2);
                        //     stitchHeightmapBorders(neighborHeightMap, heightMap, oppositeSide, 2, 0, 1);
                        // }
                    } else {
                        updatedTiles.push(neighborTile);
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

    getHeightmapPadding() {
        return this._hmPadding;
    }
}


TerrainTileProvider.prototype.__type = 'TINProvider';
