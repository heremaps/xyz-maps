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
import {TileLayerOptions} from '../TileLayerOptions';
import {FeatureProvider} from '@here/xyz-maps-core';
import {ClusterFeatureProperties} from '../../features/ClusterFeature';

/**
 * Options for configuring a ClusterTileLayer.
 */
export interface ClusterTileLayerOptions extends TileLayerOptions {
    /**
     * The data provider supplying the data to be clustered.
     */
    provider: FeatureProvider;

    /**
     * Determines whether pointer events are enabled for all features of the layer.
     * @defaultValue false
     */
    pointerEvents?: boolean;

    /**
     * The maximum zoom level at which data from the TileLayer will be displayed.
     */
    max?: number;

    /**
     * Defines the radius, in pixels, within which features should be clustered.
     * The default value is 32 pixels.
     *
     * @defaultValue 32
     */
    clusterRadius?: number;

    /**
     * Specifies the maximum zoom level at which data should be clustered.
     * If not defined, it defaults to zoom level 13.
     * When the map zoom level exceeds the `clusterMaxZoom`, raw data features will be displayed instead of clusters.
     *
     * @defaultValue 13
     */
    clusterMaxZoom?: number;

    /**
     * This function generates the initial properties of a cluster.
     * Please note that defined Properties in ClusterFeatureProperties are considered as readonly and are not allowed to be set.
     * If the function is not defined, the default implementation returns an empty object.
     */
    createProperties?: (feature: { [name: string]: any }) => ClusterFeatureProperties;

    /**
     * Use this function to aggregate cluster properties whenever a feature is being added or removed to the cluster.
     *
     * @param clusterProperties The properties of the cluster.
     * @param featureProperties The properties of the feature being added or removed.
     * @param operation The operation being performed ('add' or 'remove').
     */
    aggregateProperties?: (clusterProperties: ClusterFeatureProperties, featureProperties: { [name: string]: any }, operation: 'add' | 'remove') => void;
}
