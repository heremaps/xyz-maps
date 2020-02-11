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
import dataset from './add_feature_spec.json';

describe('add feature to spaceprovider', function() {
    const expect = chai.expect;
    var preparedData;
    var spaceProvider;

    before(async function() {
        preparedData = await prepare(dataset);
        spaceProvider = preparedData.getLayers('spaceLayer');
    });

    after(async function() {
        await preparedData.clear();
    });

    it('validate objects in an area where new feature is added', async function() {
        var objs; var robjs;
        await new Promise(function(resolve) {
            objs = spaceProvider.search({
                rect: {minLon: 20.409930789222955, minLat: 44.72414884267181, maxLon: 20.51515921329522, maxLat: 44.81676867415251},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });
        expect(objs).to.equal(undefined);
        expect(robjs).to.have.lengthOf(2);

        await new Promise(function(resolve) {
            objs = spaceProvider.search({
                rect: {minLon: 20.409930789222955, minLat: 44.72414884267181, maxLon: 20.51515921329522, maxLat: 44.81676867415251},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });

        expect(objs).to.have.lengthOf(2);
        expect(robjs).to.have.lengthOf(2);
    });


    xit('set tag and validate objects in an area where new feature is added', async function() {
        var objs; var robjs;
        await new Promise(function(resolve) {
            spaceProvider.setTags('stadium');

            objs = spaceProvider.search({
                rect: {minLon: 20.409930789222955, minLat: 44.72414884267181, maxLon: 20.51515921329522, maxLat: 44.81676867415251},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });

        expect(objs).to.equal(undefined);
        expect(robjs).to.have.lengthOf(2);

        await new Promise(function(resolve) {
            objs = spaceProvider.search({
                rect: {minLon: 20.409930789222955, minLat: 44.72414884267181, maxLon: 20.51515921329522, maxLat: 44.81676867415251},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });

        expect(objs).to.have.lengthOf(2);
        expect(robjs).to.have.lengthOf(2);
    });
});
