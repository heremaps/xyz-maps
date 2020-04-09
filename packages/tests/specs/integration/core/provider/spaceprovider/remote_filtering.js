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

import {prepare} from 'utils';
import dataset from './remote_filtering.json';

describe('remote filtering in spaceprovider', function() {
    const expect = chai.expect;
    var preparedData;
    var spaceLayer;
    var spaceProvider;

    before(async function() {
        preparedData = await prepare(dataset);
        spaceLayer = preparedData.getLayers('spaceLayer');
        spaceProvider = spaceLayer.getProvider();
    });

    after(async function() {
        await preparedData.clear();
    });

    it('validate search result without filter', async function() {
        var objs; var robjs;
        await new Promise(function(resolve) {
            objs = spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });

        expect(robjs).to.have.lengthOf(3);
    });

    it('validate search result with filter 1', async function() {
        var robjs;

        // nothing is found
        await new Promise(function(resolve) {
            spaceProvider.setPropertySearch({
                'name': {
                    operator: '=',
                    value: 'no name'
                }
            });
            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });
        expect(robjs).to.have.lengthOf(0);
    });


    it('validate search result with filter 2', async function() {
        var robjs;

        // one feature is found
        await new Promise(function(resolve) {
            spaceProvider.setPropertySearch({
                'name': {
                    operator: '=',
                    value: 'Stade de Gerland'
                }
            });

            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });
        expect(robjs).to.have.lengthOf(1);
    });


    it('validate search result with filter 3', async function() {
        var robjs;

        // multiple features are found
        await new Promise(function(resolve) {
            spaceProvider.setPropertySearch({
                'name': {
                    operator: '=',
                    value: ['Stade de Gerland', 'Olympique Lyonnais', 'Stade Geoffroy-Guichard']
                }
            });

            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });
        expect(robjs).to.have.lengthOf(3);
    });


    it('validate search result with filter 4', async function() {
        var robjs;

        // multiple features are found
        await new Promise(function(resolve) {
            spaceProvider.setPropertySearch({
                'name': {
                    operator: '=',
                    value: ['no name', 'Olympique Lyonnais', 'Stade Geoffroy-Guichard']
                }
            });

            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });
        expect(robjs).to.have.lengthOf(2);
    });

    it('validate search result with filter 5', async function() {
        var robjs;

        // multiple filter, multiple features are found
        await new Promise(function(resolve) {
            spaceProvider.setPropertySearch({
                'name': {
                    operator: '=',
                    value: ['no name', 'Olympique Lyonnais', 'Stade Geoffroy-Guichard']
                },
                'capacity': {
                    operator: '<',
                    value: 70000
                }
            });

            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });
        expect(robjs).to.have.lengthOf(2);
    });


    it('validate search result with filter 6', async function() {
        var robjs;

        // multiple filter, one feature is found
        await new Promise(function(resolve) {
            spaceProvider.setPropertySearch({
                'name': {
                    operator: '=',
                    value: ['no name', 'Olympique Lyonnais', 'Stade Geoffroy-Guichard']
                },
                'capacity': {
                    operator: '<',
                    value: 50000
                }
            });

            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });
        expect(robjs).to.have.lengthOf(1);
    });


    it('validate search result with filter 7', async function() {
        var robjs;

        // set filter with individual property
        await new Promise(function(resolve) {
            spaceProvider.setPropertySearch('capacity', '>', 30000);

            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });
        expect(robjs).to.have.lengthOf(3);
    });


    it('clear filter and validate search', async function() {
        var robjs;

        // set filter with individual property
        await new Promise(function(resolve) {
            spaceProvider.setPropertySearch('capacity', '>', 40000);

            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });
        expect(robjs).to.have.lengthOf(2);

        await new Promise(function(resolve) {
            spaceProvider.setPropertySearch();

            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: function(e) {
                    robjs = e;
                    resolve();
                }
            });
        });
        expect(robjs).to.have.lengthOf(3);
    });
});
