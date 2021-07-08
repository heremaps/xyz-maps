/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
import {TileLayerOptions} from './TileLayerOptions';

/**
 *  Options to configure a MVTLayer.
 */
export interface MVTLayerOptions extends TileLayerOptions {
    /**
     * options to configure the remote MVT datasource
     */
    remote: {
        /**
         * URL to the remote MVT endpoint.
         *
         * It is either a string which may contain the following flags that will be replaced:
         * - \{SUBDOMAIN_CHAR\}: subdomain id(a, b, c and d) for balancing the load
         * - \{SUBDOMAIN_INT\}: subdomain id(0, 1, 2 and 3) for balancing the load
         * - \{SUBDOMAIN_INT_1_4\}: subdomain id(1, 2, 3 and 4) for balancing the load
         * - \{QUADKEY\}: quadkey of the tile to be requested
         * - \{Z\}: z of the tile to be requested
         * - \{X\}: x of the tile to be requested
         * - \{Y\}: y of the tile to be requested
         *
         * or a callback function that's called with the following parameters z,y,x,quadkey and needs to returns the url for the respective tile.
         * The callback function needs to handle custom parameters by its own.
         *
         * @example
         * ```
         * // string
         * url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=YOUR_ACCESS_TOKEN'
         *
         * // callback function
         * url: (z, y, x, quadkey) => {
         *     return `https://xyz.api.here.com/tiles/osmbase/512/all/${z}/${x}/${y}.mvt?access_token=YOUR_ACCESS_TOKEN`
         * }
         * ```
         */
        url: string | ((z: number, y: number, x: number, quadkey: string) => string)
        /**
         * The maximum zoom level for loading map tiles
         * @defaultValue 16
         */
        max?: number;
        /**
         * The minimum zoom level for loading map tiles
         * @defaultValue 1
         */
        min?: number;
        /**
         * defines the size of the mvt tile data in pixel.
         * @defaultValue 512
         */
        tileSize?: number
    },
    /**
     * enable or disable pointer-event triggering for all features of all layers.
     * @defaultValue false
     */
    pointerEvents?: boolean
}
