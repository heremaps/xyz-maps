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
import dataset from './remote_filtering.json';
import {Feature} from '@here/xyz-maps-core';

describe('remote filtering in spaceprovider', () => {
    const expect = chai.expect;
    var preparedData;
    var spaceLayer;
    var spaceProvider;

    before(async () => {
        preparedData = await prepare(dataset);
        spaceLayer = preparedData.getLayers('spaceLayer');
        spaceProvider = spaceLayer.getProvider();
    });

    after(async () => {
        await preparedData.clear();
    });

    it('validate search feature by id remotely', async () => {
        let featureId = preparedData.features['spaceLayer'].remote[0];
        let result = await new Promise<Feature>((resolve) => {
            spaceProvider.search({
                id: featureId,
                remote: true,
                onload: (result) => {
                    resolve(result);
                }
            });
        });
        expect(result.id).to.equal(featureId);
        spaceProvider.clear();
    });

    it('validate search result without filter', async () => {
        let result = await new Promise<void>((resolve) => {
            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: (result) => {
                    resolve(result);
                }
            });
        });

        expect(result).to.have.lengthOf(3);
    });

    it('validate search result with filter 1', async () => {
        // nothing is found
        let result = await new Promise<void>((resolve) => {
            spaceProvider.setPropertySearch({
                'name': {
                    operator: '=',
                    value: 'no name'
                }
            });
            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: (result) => {
                    resolve(result);
                }
            });
        });
        expect(result).to.have.lengthOf(0);
    });


    it('validate search result with filter 2', async () => {
        // one feature is found
        let result = await new Promise<void>((resolve) => {
            spaceProvider.setPropertySearch({
                'name': {
                    operator: '=',
                    value: 'Stade de Gerland'
                }
            });

            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: (result) => {
                    resolve(result);
                }
            });
        });
        expect(result).to.have.lengthOf(1);
    });


    it('validate search result with filter 3', async () => {
        // multiple features are found
        let result = await new Promise<void>((resolve) => {
            spaceProvider.setPropertySearch({
                'name': {
                    operator: '=',
                    value: ['Stade de Gerland', 'Olympique Lyonnais', 'Stade Geoffroy-Guichard']
                }
            });

            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: (result) => {
                    resolve(result);
                }
            });
        });
        expect(result).to.have.lengthOf(3);
    });


    it('validate search result with filter 4', async () => {
        // multiple features are found
        let result = await new Promise<void>((resolve) => {
            spaceProvider.setPropertySearch({
                'name': {
                    operator: '=',
                    value: ['no name', 'Olympique Lyonnais', 'Stade Geoffroy-Guichard']
                }
            });

            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: (result) => {
                    resolve(result);
                }
            });
        });
        expect(result).to.have.lengthOf(2);
    });

    it('validate search result with filter 5', async () => {
        // multiple filter, multiple features are found
        let result = await new Promise<void>((resolve) => {
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
                onload: (result) => {
                    resolve(result);
                }
            });
        });
        expect(result).to.have.lengthOf(2);
    });


    it('validate search result with filter 6', async () => {
        // multiple filter, one feature is found
        let result = await new Promise<void>((resolve) => {
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
                onload: (result) => {
                    resolve(result);
                }
            });
        });
        expect(result).to.have.lengthOf(1);
    });


    it('validate search result with filter 7', async () => {
        // set filter with individual property
        let result = await new Promise<void>((resolve) => {
            spaceProvider.setPropertySearch('capacity', '>', 30000);

            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: (result) => {
                    resolve(result);
                }
            });
        });
        expect(result).to.have.lengthOf(3);
    });


    it('clear filter and validate search', async () => {
        // set filter with individual property
        let result = await new Promise<void>((resolve) => {
            spaceProvider.setPropertySearch('capacity', '>', 40000);

            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: (result) => {
                    resolve(result);
                }
            });
        });
        expect(result).to.have.lengthOf(2);

        result = await new Promise<void>((resolve) => {
            spaceProvider.setPropertySearch();

            spaceProvider.search({
                rect: {minLon: 4.3825, minLat: 45.422019, maxLon: 4.9825, maxLat: 45.773889},
                remote: true,
                onload: (result) => {
                    resolve(result);
                }
            });
        });
        expect(result).to.have.lengthOf(3);
    });
});
