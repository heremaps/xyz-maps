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
import dataset from './search_remote_geojsonprovider_spec.json';

// GeoJSonProvider actually does not support remote search......
// search locally instead
describe('search in geojson providers remotely', function() {
    const expect = chai.expect;

    var poiLayer;
    var results;

    before(async function() {
        let preparedData = await prepare(dataset);
        poiLayer = preparedData.getLayers('placeGeoJsonLayer');
    });

    it('search by point and radius and validate object is returned', async function() {
        results = await new Promise((resolve) => {
            poiLayer.search({
                point: {longitude: -99.672185, latitude: 29.76752899999997},
                radius: 50,
                remote: true,
                onload: resolve
            });
        });

        expect(results).to.have.lengthOf(3);
    });


    it('search by point and rect for 4 times remotely and validate', async function() {
        results = await new Promise((resolve) => {
            let objs = poiLayer.search({
                point: {longitude: -99.88524449814317, latitude: 29.682423714345788},
                radius: 50,
                remote: true,
                onload: resolve
            });

            expect(objs).to.equal(undefined);
        });

        expect(results).to.have.lengthOf(3);

        let objs = poiLayer.search({
            point: {longitude: -99.88524449814317, latitude: 29.682423714345788},
            radius: 50,
            remote: true,
            onload: function(e) {
                expect(e).to.have.lengthOf(3);
            }
        });
        expect(objs).to.have.lengthOf(3);

        results = await new Promise((resolve) => {
            let objs = poiLayer.search({
                point: {longitude: -99.88524449814317, latitude: 29.682423714345788},
                radius: 80,
                remote: true,
                onload: resolve
            });

            expect(objs).to.have.lengthOf(5);
        });

        expect(results).to.have.lengthOf(5);

        results = await new Promise((resolve) => {
            let objs = poiLayer.search({
                rect: {minLon: -99.887272, minLat: 29.681191, maxLon: -99.882981, maxLat: 29.683987},
                radius: 80,
                remote: true,
                onload: resolve
            });
            expect(objs).to.have.lengthOf(7);
        });

        expect(results).to.have.lengthOf(7);
    });


    it('search by rect and validate', async function() {
        results = await new Promise((resolve) => {
            let objs = poiLayer.search({
                rect: {minLon: -99.398368, minLat: 29.408905, maxLon: -99.395016, maxLat: 29.411138},
                remote: true,
                onload: resolve
            });
            expect(objs).to.equal(undefined);
        });

        expect(results).to.have.lengthOf(4);

        results = await new Promise((resolve) => {
            let objs = poiLayer.search({
                rect: {minLon: -99.398368, minLat: 29.408905, maxLon: -99.395016, maxLat: 29.411138},
                remote: true,
                onload: resolve
            });
            expect(objs).to.have.lengthOf(4);
        });

        expect(results).to.have.lengthOf(4);
    });
});
