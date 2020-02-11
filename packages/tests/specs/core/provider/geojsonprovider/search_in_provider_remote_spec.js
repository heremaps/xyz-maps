/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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

import {prepare} from 'hereTest';
import dataset from './search_in_provider_remote_spec.json';

// GeoJSonProvider actually does not support remote search......
// search locally instead
describe('search in providers remotely', function() {
    const expect = chai.expect;

    var poiProvider;

    before(async function() {
        let preparedData = await prepare(dataset);

        let poiLayer = preparedData.getLayers('placeGeoJsonLayer');
        poiProvider = poiLayer.getProvider();
    });

    it('search in provider by point and radius and validate 2 objects are returned', async function() {
        let results = await new Promise((resolve) => {
            let objs = poiProvider.search({
                point: {longitude: -95.92996223081991, latitude: 28.531008534187464},
                radius: 80,
                remote: true,
                onload: resolve
            });
            expect(objs).to.equal(undefined);
        });

        expect(results).to.have.lengthOf(2);
    });

    it('search in provider by point and radius at same place for 3 times remotely ', async function() {
        let results = await new Promise((resolve) => {
            let objs = poiProvider.search({
                point: {longitude: -95.927074290413, latitude: 28.794165759127793},
                radius: 100,
                remote: true,
                onload: resolve
            });
            expect(objs).to.equal(undefined);
        });

        expect(results).to.have.lengthOf(4);

        results = await new Promise((resolve) => {
            let objs = poiProvider.search({
                point: {longitude: -95.927074290413, latitude: 28.794165759127793},
                radius: 30,
                remote: true,
                onload: resolve
            });
            expect(objs).to.have.lengthOf(2);
        });

        expect(results).to.have.lengthOf(2);

        results = await new Promise((resolve) => {
            let objs = poiProvider.search({
                point: {longitude: -95.927074290413, latitude: 28.794165759127793},
                radius: 180,
                remote: true,
                onload: resolve
            });
            expect(objs).to.have.lengthOf(6);
        });

        expect(results).to.have.lengthOf(6);
    });

    it('search in provider by viewport and validate at same place for 2 times', async function() {
        await new Promise((resolve) => {
            let objs = poiProvider.search({
                rect: {minLon: -95.936362, minLat: 28.885083, maxLon: -95.932071, maxLat: 28.887901},
                remote: true,
                onload: resolve
            });
        });

        let results = await new Promise((resolve) => {
            let objs = poiProvider.search({
                rect: {minLon: -95.936362, minLat: 28.885083, maxLon: -95.932071, maxLat: 28.887901},
                remote: true,
                onload: resolve
            });
            expect(objs).to.have.lengthOf(3);
        });

        expect(results).to.have.lengthOf(3);
    });


    it('search in provider by viewport and validate at same place for 2 times', async function() {
        let results = await new Promise((resolve) => {
            let objs = poiProvider.search({
                rect: {minLon: -95.579384, minLat: 28.882135, maxLon: -95.575093, maxLat: 28.884926},
                remote: true,
                onload: resolve
            });
            expect(objs).to.equal(undefined);
        });

        expect(results).to.have.lengthOf(5);

        results = await new Promise((resolve) => {
            let objs = poiProvider.search({
                rect: {minLon: -95.579384, minLat: 28.882135, maxLon: -95.575093, maxLat: 28.884926},
                remote: true,
                onload: resolve
            });
            expect(objs).to.have.lengthOf(5);
        });

        expect(results).to.have.lengthOf(5);
    });
});
