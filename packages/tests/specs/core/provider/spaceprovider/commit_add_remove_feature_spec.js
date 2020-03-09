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
import dataset from './commit_add_remove_feature_spec.json';

xdescribe('commit add and remove feature to spaceprovider', function() {
    const expect = chai.expect;

    var dataset;
    var preparedData;
    var spaceProvider;

    before(async function() {
        // preparedData = await prepare(dataset);
        // spaceProvider = preparedData.getLayers('spaceLayer');
    });

    after(async function() {
        // await preparedData.clear();
    });


    xit('add feature and validate', async function() {
        var objs; var robjs;
        await new Promise(function(resolve) {
            objs = spaceProvider.search({
                rect: {minLon: 76.90515666069302, minLat: 10.384625823443457, maxLon: 76.92232279838834, maxLat: 10.3934269819065},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });
        expect(robjs).to.have.lengthOf(0);

        await new Promise(function(resolve, reject) {
            spaceProvider.commit(
                {
                    put: {
                        geometry: {
                            coordinates: [76.91373972954068, 10.389026433657435, 0],
                            type: 'Point'
                        },
                        type: 'Feature',
                        properties: {
                            '@ns:com:here:xyz': {
                                tags: ['test']
                            }
                        }
                    }
                }, resolve, reject
            );
        });

        await new Promise(function(resolve) {
            objs = spaceProvider.search({
                rect: {minLon: 76.90515666069302, minLat: 10.384625823443457, maxLon: 76.92232279838834, maxLat: 10.3934269819065},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });

        expect(robjs).to.have.lengthOf(1);
    });
});
