/*
 * Copyright (C) 2019-2024 HERE Europe B.V.
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
import {Feature} from './Feature';
import {GeoJSONBBox, GeoJSONCoordinate} from './GeoJSON';

export const updateBBox = (bbox: GeoJSONBBox, [longitude, latitude]: GeoJSONCoordinate) => {
    if (longitude < bbox[0]) bbox[0] = longitude;
    if (longitude > bbox[2]) bbox[2] = longitude;
    if (latitude < bbox[1]) bbox[1] = latitude;
    if (latitude > bbox[3]) bbox[3] = latitude;
    return bbox;
};
/**
 * Properties of a ClusterFeature.
 *
 * The `isCluster`, `clusterSize`, and `zoom` properties are automatically populated for each cluster feature.
 *
 * Custom properties aggregation for clusters can be achieved by defining custom property creation and aggregation functions using the {@link ClusterTileLayerOptions.createProperties|createProperties} and {@link ClusterTileLayerOptions.aggregateProperties|aggregateProperties} options.
 */
export type ClusterFeatureProperties = {
    /**
     * Indicates if the feature is a cluster.
     */
    readonly isCluster: true;
    /**
     * The size of the cluster, i.e., the number of features it contains.
     */
    readonly clusterSize: number;
    /**
     * The zoom level at which the cluster was formed.
     */
    readonly zoom: number;
    /**
     * Additional custom properties of the cluster feature.
     */
    [name: string]: any;
}

/**
 * This Feature represents a Cluster.
 */
export class ClusterFeature extends Feature<'Point'> {
    /**
     * The Properties of the Cluster feature.
     */
    properties: ClusterFeatureProperties;

    /**
     * The geometry of a cluster feature is of type 'Point',
     * where the `coordinates` represent the geographical coordinates [longitude, latitude] of the cluster center.
     */
    geometry: {
        type: 'Point',
        coordinates: GeoJSONCoordinate
    };

    /**
     * Returns the features within the cluster.
     * @returns An array containing the features within the cluster.
     */
    getFeatures();

    getFeatures(result: Feature[]);
    getFeatures(result: Feature[] = []) {
        for (let feature of this.properties._clustered) {
            if (feature instanceof ClusterFeature) {
                feature.getFeatures(result);
            } else {
                result.push(feature);
            }
        }
        return result;
    }

    /**
     * Calculates and returns the bounding box of the cluster.
     * @returns The bounding box of the cluster.
     */
    getClusterBBox() {
        const bbox: GeoJSONBBox = [Infinity, Infinity, -Infinity, -Infinity];
        for (let feature of this.getFeatures()) {
            updateBBox(bbox, feature.geometry.coordinates);
        }
        return bbox;
    }
}
