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
import {getProviderZoomOffset, TileLayer} from '../TileLayer';
import {defaultMaxGeometricError, TerrainTileLayerOptions} from './TerrainTileLayerOptions';
import {parseTileSize} from '../TileLayerOptions';
import {TerrainTileProvider} from '../../providers/TerrainProvider/TerrainTileProvider';
import {TerrainTileLayerStyle} from './TerrainStyle';

const DEFAULT_TILE_SIZE = 512;

/**
 * TerrainTileLayer is a specialized TileLayer that renders elevation or terrain data.
 * It handles terrain-specific logic such as elevation decoding, mesh generation, and
 * rendering optimizations suited for digital elevation models (DEMs).
 */
export class TerrainTileLayer extends TileLayer {
    /**
     * Constructs a new TerrainTileLayer instance.
     *
     * @param options - Configuration options for the terrain layer, including data source,
     *                  mesh resolution, elevation decoder, and rendering parameters.
     */
    constructor(options: TerrainTileLayerOptions) {
        const {elevation: elevationOptions} = options;
        const {url, encoding} = elevationOptions;
        const tileSize = options.tileSize || parseTileSize(url as string) || DEFAULT_TILE_SIZE;
        const responseType = encoding.includes('json')
            ? 'json' : encoding == 'xyztrn'
                ? 'arraybuffer'
                : 'image';

        if (!responseType) {
            throw new Error('TerrainTileLayer requires a valid `encoding` in elevation options.');
        }
        // const zoomOffset = getProviderZoomOffset(tileSize);
        const imageryUrl = options.imagery?.url;

        super({
            adaptiveGrid: true,
            pointerEvents: false,
            margin: 0,
            ...options,
            tileSize,
            provider: new TerrainTileProvider({
                maxGeometricError: options.maxGeometricError || defaultMaxGeometricError,
                terrain: {
                    attribution: elevationOptions.attribution,
                    url,
                    encoding,
                    responseType,
                    heightScale: elevationOptions.scale ?? 1,
                    heightOffset: elevationOptions.offset ?? 0,
                    min: elevationOptions.min ?? 1,
                    max: elevationOptions.max ?? 20
                },
                ...(imageryUrl ? {
                    imagery: {
                        attribution: options.imagery.attribution,
                        url: imageryUrl,
                        responseType: 'image'
                    }
                } : {})
            }),
            style: options.style instanceof TerrainTileLayerStyle
                ? options.style
                : new TerrainTileLayerStyle()
        });

        this.getStyle().setTileSize(tileSize);
    }

    getStyle(): TerrainTileLayerStyle {
        return super.getStyle() as TerrainTileLayerStyle;
    }
}
