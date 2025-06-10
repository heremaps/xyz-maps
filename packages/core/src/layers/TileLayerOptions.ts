/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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

import TileProvider from '../providers/TileProvider/TileProvider';
import {LayerStyle} from '../styles/LayerStyle';
import {LayerOptions} from './LayerOptions';


export const parseTileSize = (url: string): number | null => {
    // check if tilesize is defined in url..
    const matches = typeof url == 'string' && url.match(/256|512|1024|2048|4096/);
    return matches ? Number(matches[0]) : null;
};


/**
 *  Configuration options for a TileLayer.
 */
export interface TileLayerOptions extends LayerOptions {
    /**
     * Name of the TileLayer.
     */
    name?: string;

    /**
     * minimum zoom level at which data from the TileLayer will be displayed.
     */
    min?: number;

    /**
     * maximum zoom level at which data from the TileLayer will be displayed.
     */
    max?: number;

    /**
     * The data provider(s) for the TileLayer.
     *
     * The provider can either be a single TileProvider or an array of {min: number, max: number, provider: TileProvider}, where "min" and "max" define the minimum and maximum zoom level at which data from the "provider" should be used.
     * If a single provider is defined, it's data will be used for all zoom levels.
     * If several providers are defined for a single zoom level, only the data of the first defined is used.
     */
    provider?: TileProvider | {
        /**
         * The minimum zoom level at which data from the TileProvider will be used.
         */
        min: number,
        /**
         * The maximum zoom level at which data from the TileProvider will be used.
         */
        max: number,
        /**
         * The Tile Provider for the respective zoom level.
         */
        provider: TileProvider
    }[];
    /**
     * @internal
     */
    providers?: any;

    /**
     * Style for rendering features in this layer.
     */
    style?: LayerStyle;

    /**
     * tileMargin that should be applied to all providers of the layer.
     */
    margin?: number;
    /**
     * the size of the tile data in pixel.
     * @defaultValue 512
     */
    tileSize?: number;

    /**
     * Determines whether pointer events are enabled for all features of the layer.
     * @defaultValue true
     */
    pointerEvents?: boolean;
    /**
     * Indicates whether the layer supports adaptive tile loading.
     *
     * When enabled, tiles are dynamically selected from higher zoom levels
     * based on their distance, improving performance and rendering efficiency.
     * This is particularly useful for high pitch map views, as it enhances
     * viewing distance and clarity.
     *
     * @hidden
     * @internal
     */
    adaptiveGrid?: boolean;

    /**
     * Attribution information for data sources used by this layer.
     *
     * Attributions are automatically displayed or hidden depending on whether the corresponding
     * data is currently active or visible on the map — e.g., based on zoom level, layer visibility,
     * or usage. This ensures that only active data providers are credited, as required by licensing.
     *
     * Can be a simple string (displayed as static text), or an array of structured attribution entries
     * that support clickable labels and optional tooltips.
     *
     * @example
     * // Simple attribution string
     * attribution: "© Data Provider"
     *
     * @example
     * // Multiple detailed attributions
     * attribution: [
     *     {
     *         label: "© Elevation Provider",
     *         url: "https://elevation.example.com",
     *         title: "Elevation data source"
     *     },
     *     {
     *         label: "Imagery © HERE Maps",
     *         url: "https://www.here.com",
     *         title: "Satellite imagery by HERE"
     *     }
     * ]
     */
    attribution?: string | {
        /**
         * The text label displayed in the attribution control.
         */
        label: string;
        /**
         * (Optional) A URL that opens when the label is clicked.
         */
        url?: string;
        /**
         * (Optional) Tooltip shown on hover over the label.
         */
        title?: string;
    }[];
}
