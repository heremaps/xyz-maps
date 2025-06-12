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

import {TileStorage} from '../../storage/TileStorage';

import {DataSourceAttribution} from '../../layers/DataSourceAttribution';

/**
 *  Options to configure the Provider.
 */
interface TileProviderOptions {
    /**
     * optional id to identify the provider.
     */
    id?: string;

    /**
     * Name of the provider.
     */
    name?: string;

    /**
     * Tile margin of the provider.
     */
    margin?: number;

    /**
     * @internal
     */
    storage?: TileStorage;

    /**
     * Attribution information for data sources used by this provider.
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
    attribution?: string | DataSourceAttribution | DataSourceAttribution[];
}

export {TileProviderOptions};
