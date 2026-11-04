/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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

import {prepare} from 'utils';
import dataset from './cluster-tile-layer.json';
import {ClusterTileLayer} from '@here/xyz-maps-core';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('ClusterTileLayer', function() {
    let dataLayer;
    let clusterLayer;
    let clusterMaxZoom = 13;
    let preparedData;

    beforeEach(async function() {
        preparedData = await prepare(dataset);
        dataLayer = preparedData.getLayers('dataLayer');

        clusterLayer = new ClusterTileLayer({
            min: 2,
            max: 20,
            tileSize: 512,
            clusterMaxZoom: clusterMaxZoom,
            clusterRadius: 64,
            provider: dataLayer.getProvider()
        });

        clusterLayer.listenForDataUpdates(true);
    });
    afterEach(async () => {
        clusterLayer?.listenForDataUpdates(false);
        await preparedData?.clear();
    });

    it('updates cluster membership and sizes as features are added across zoom levels', async () => {
        let clusters = clusterLayer.getProvider(11).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).toHaveLength(0);
        dataLayer.addFeature({
            id: 'F0',
            type: 'Feature',
            properties: {},
            geometry: {'type': 'Point', 'coordinates': [5.595344540913686, 51.955245165606556]}
        });

        clusters = clusterLayer.getProvider(10).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).toHaveLength(1);
        expect(clusters[0].properties.clusterSize).toBe(1);
        dataLayer.addFeature({
            id: 'F1',
            type: 'Feature',
            properties: {},
            geometry: {'type': 'Point', 'coordinates': [5.629676715081445, 51.955245165606556]}
        });

        clusters = clusterLayer.getProvider(10).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).toHaveLength(1);
        expect(clusters[0].properties.clusterSize).toBe(2);
        dataLayer.addFeature({
            id: 'F2',
            type: 'Feature',
            properties: {},
            geometry: {'type': 'Point', 'coordinates': [5.664008889249146, 51.955245165606556]}
        });

        clusters = clusterLayer.getProvider(10).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).toHaveLength(1);
        expect(clusters[0].properties.clusterSize).toBe(3);
        dataLayer.addFeature({
            id: 'F3',
            type: 'Feature',
            properties: {},
            geometry: {'type': 'Point', 'coordinates': [5.732673237584663, 51.955245165606556]}
        });

        clusters = clusterLayer.getProvider(10).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).toHaveLength(2);
        clusters = clusterLayer.getProvider(10).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters[0].properties.clusterSize).toBe(3);
        expect(clusters[1].properties.clusterSize).toBe(1);
        // Re-adding F3 must not increase membership when querying finer zoom levels.
        dataLayer.addFeature({
            id: 'F3',
            type: 'Feature',
            properties: {},
            geometry: {'type': 'Point', 'coordinates': [5.732673237584663, 51.955245165606556]}
        });

        clusters = clusterLayer.getProvider(11).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).toHaveLength(3);
        clusters = clusterLayer.getProvider(11).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters[0].properties.clusterSize).toBe(2);
        expect(clusters[1].properties.clusterSize).toBe(1);
        expect(clusters[2].properties.clusterSize).toBe(1);
        dataLayer.addFeature({
            id: 'F3',
            type: 'Feature',
            properties: {},
            geometry: {'type': 'Point', 'coordinates': [5.732673237584663, 51.955245165606556]}
        });

        clusters = clusterLayer.getProvider(12).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).toHaveLength(4);
        clusters = clusterLayer.getProvider(12).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters[0].properties.clusterSize).toBe(1);
        expect(clusters[1].properties.clusterSize).toBe(1);
        expect(clusters[2].properties.clusterSize).toBe(1);
        expect(clusters[3].properties.clusterSize).toBe(1);
        clusters = clusterLayer.getProvider(9).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).toHaveLength(1);
        clusters = clusterLayer.getProvider(9).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters[0].properties.clusterSize).toBe(4);
        clusters = clusterLayer.getProvider(8).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).toHaveLength(1);
        clusters = clusterLayer.getProvider(8).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters[0].properties.clusterSize).toBe(4);
    });
});
