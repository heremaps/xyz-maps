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
         * url to the remote mvt endpoint
         */
        url: string
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
