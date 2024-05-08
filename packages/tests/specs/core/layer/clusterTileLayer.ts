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

import {prepare} from 'utils';
import dataset from './clusterTileLayer.json';
import {ClusterTileLayer} from '@here/xyz-maps-core';

describe('ClusterTileLayer', function() {
    const expect = chai.expect;

    let dataLayer;
    let clusterLayer;
    let clusterMaxZoom = 13;

    before(async function() {
        let preparedData = await prepare(dataset);
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

        console.log(clusterLayer);
        // [5.374586091665641, 51.955245165606556]
    });
    //
    it('validate no clustered', ()=>{
        let clusters = clusterLayer.getProvider(11).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).to.have.lengthOf(0);
    });

    it('add a feature, validate cluster with clusterSize 1', async () => {
        dataLayer.addFeature({
            id: 'F0',
            type: 'Feature',
            properties: {},
            geometry: {'type': 'Point', 'coordinates': [5.595344540913686, 51.955245165606556]}
        });

        let clusters = clusterLayer.getProvider(10).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).to.have.lengthOf(1);
        expect(clusters[0].properties.clusterSize).to.equal(1);
    });

    it('add another feature, validate clusters', async () => {
        dataLayer.addFeature({
            id: 'F1',
            type: 'Feature',
            properties: {},
            geometry: {'type': 'Point', 'coordinates': [5.629676715081445, 51.955245165606556]}
        });

        let clusters = clusterLayer.getProvider(10).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).to.have.lengthOf(1);
        expect(clusters[0].properties.clusterSize).to.equal(2);
    });

    it('add another feature, validate clusters', async () => {
        dataLayer.addFeature({
            id: 'F2',
            type: 'Feature',
            properties: {},
            geometry: {'type': 'Point', 'coordinates': [5.664008889249146, 51.955245165606556]}
        });

        let clusters = clusterLayer.getProvider(10).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).to.have.lengthOf(1);
        expect(clusters[0].properties.clusterSize).to.equal(3);
    });

    it('add feature close to existing cluster and we now have 2 clusters', async () => {
        dataLayer.addFeature({
            id: 'F3',
            type: 'Feature',
            properties: {},
            geometry: {'type': 'Point', 'coordinates': [5.732673237584663, 51.955245165606556]}
        });

        let clusters = clusterLayer.getProvider(10).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).to.have.lengthOf(2);
    });

    it('validate clusters sizes', async () => {
        let clusters = clusterLayer.getProvider(10).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters[0].properties.clusterSize).to.equal(3);
        expect(clusters[1].properties.clusterSize).to.equal(1);
    });

    it('validate cluster in zoomlevel +1', async () => {
        dataLayer.addFeature({
            id: 'F3',
            type: 'Feature',
            properties: {},
            geometry: {'type': 'Point', 'coordinates': [5.732673237584663, 51.955245165606556]}
        });

        let clusters = clusterLayer.getProvider(11).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).to.have.lengthOf(3);
    });
    it('validate clusters sizes in zoomlevel +1', async () => {
        let clusters = clusterLayer.getProvider(11).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters[0].properties.clusterSize).to.equal(2);
        expect(clusters[1].properties.clusterSize).to.equal(1);
        expect(clusters[2].properties.clusterSize).to.equal(1);
    });

    it('validate cluster in zoomlevel +2', async () => {
        dataLayer.addFeature({
            id: 'F3',
            type: 'Feature',
            properties: {},
            geometry: {'type': 'Point', 'coordinates': [5.732673237584663, 51.955245165606556]}
        });

        let clusters = clusterLayer.getProvider(12).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).to.have.lengthOf(4);
    });
    it('validate clusters sizes in zoomlevel +2', async () => {
        let clusters = clusterLayer.getProvider(12).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters[0].properties.clusterSize).to.equal(1);
        expect(clusters[1].properties.clusterSize).to.equal(1);
        expect(clusters[2].properties.clusterSize).to.equal(1);
        expect(clusters[3].properties.clusterSize).to.equal(1);
    });

    it('validate cluster in zoomlevel -1', async () => {
        let clusters = clusterLayer.getProvider(9).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).to.have.lengthOf(1);
    });
    it('validate clusters sizes in zoomlevel -1', async () => {
        let clusters = clusterLayer.getProvider(9).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters[0].properties.clusterSize).to.equal(4);
    });

    it('validate cluster in zoomlevel -2', async () => {
        let clusters = clusterLayer.getProvider(8).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters).to.have.lengthOf(1);
    });
    it('validate clusters sizes in zoomlevel -2', async () => {
        let clusters = clusterLayer.getProvider(8).search({
            point: {longitude: 5.595344540913686, latitude: 51.955245165606556},
            radius: 100_000
        });
        expect(clusters[0].properties.clusterSize).to.equal(4);
    });
});
