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
import dataset from './search_remote_spec.json';

describe('search in layers remotely', function() {
    const expect = chai.expect;
    var preparedData;
    var addressLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        addressLayer = preparedData.getLayers('addressLayer');
    });

    after(async function() {
        await preparedData.clear();
    });

    it('search by point and radius and rectangle remotely at same area and validate 1 object is returned', async function() {
        let results = await new Promise((resolve) => {
            let objs = addressLayer.search({
                point: {longitude: 78.903642, latitude: 14.307483},
                radius: 25,
                remote: true,
                onload: resolve
            });
            expect(objs).to.equal(undefined);
        });

        let pa = preparedData.getFeature('addressLayer', -10462);


        expect(results).to.have.lengthOf(1);
        expect(results[0]).to.deep.include({id: pa.id});

        results = await new Promise((resolve) => {
            let objs = addressLayer.search({
                rect: {minLon: 78.903069, minLat: 14.307089, maxLon: 78.904142, maxLat: 14.307869},
                remote: true,
                onload: resolve
            });
            expect(objs).to.have.lengthOf(2);
        });

        expect(results).to.have.lengthOf(2);
    });

    it('search by point and radius 3 times remotely and same area then validate no object is returned directly', async function() {
        let results = await new Promise((resolve) => {
            let objs = addressLayer.search({
                point: {longitude: 78.943626, latitude: 14.59739},
                radius: 30,
                remote: true,
                onload: resolve
            });
            expect(objs).to.equal(undefined);
        });

        expect(results).to.have.lengthOf(3);

        results = await new Promise((resolve) => {
            let objs = addressLayer.search({
                point: {longitude: 78.943626, latitude: 14.59739},
                radius: 30,
                remote: true,
                onload: resolve
            });
            expect(objs).to.have.lengthOf(3);
        });

        expect(results).to.have.lengthOf(3);

        results = await new Promise((resolve) => {
            let objs = addressLayer.search({
                point: {longitude: 78.943626, latitude: 14.59739},
                radius: 40,
                remote: true,
                onload: resolve
            });
            expect(objs).to.have.lengthOf(4);
        });

        expect(results).to.have.lengthOf(4);
    });


    it('search by rect two times and validate remotely', async function() {
        let results = await new Promise((resolve) => {
            let obj = addressLayer.search({
                rect: {minLon: 78.868647, minLat: 14.287684, maxLon: 78.872938, maxLat: 14.289753},
                remote: true,
                onload: resolve
            });
            expect(obj).to.equal(undefined);
        });

        expect(results).to.have.lengthOf(2);

        results = await new Promise((resolve) => {
            let objs = addressLayer.search({
                rect: {minLon: 78.868647, minLat: 14.287684, maxLon: 78.872938, maxLat: 14.289753},
                remote: true,
                onload: resolve
            });
        });

        expect(results).to.have.lengthOf(2);
    });
});
