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
import dataset from './settag_space_spec.json';

describe('settag in spaceprovider', function() {
    const expect = chai.expect;

    var preparedData;
    var spaceProvider;
    var results;

    before(async function() {
        preparedData = await prepare(dataset);
        let spaceLayer = preparedData.getLayers('spaceLayer');
        spaceProvider = spaceLayer.getProvider();
    });

    after(async function() {
        await preparedData.clear();
    });

    it('validate objects in a rectangle', async function() {
        var objs;
        results = await new Promise(function(resolve) {
            objs = spaceProvider.search({
                rect: {minLon: 4.718062700195333, minLat: 45.54142036819957, maxLon: 5.138976396484395, maxLat: 45.905733172453694},
                remote: true,
                onload: resolve
            });
        });
        expect(objs).to.equal(undefined);
        expect(results).to.have.lengthOf(2);

        results = await new Promise(function(resolve) {
            objs = spaceProvider.search({
                rect: {minLon: 4.718062700195333, minLat: 45.54142036819957, maxLon: 5.138976396484395, maxLat: 45.905733172453694},
                remote: true,
                onload: resolve
            });
        });
        expect(objs).to.have.lengthOf(2);
        expect(results).to.have.lengthOf(2);
    });

    it('set tag and validate objects in a rectangle', async function() {
        var objs;
        results = await new Promise(function(resolve) {
            spaceProvider.setTags('football');

            objs = spaceProvider.search({
                rect: {minLon: 4.718062700195333, minLat: 45.54142036819957, maxLon: 5.138976396484395, maxLat: 45.905733172453694},
                remote: true,
                onload: resolve
            });
        });
        expect(objs).to.equal(undefined);
        expect(results).to.have.lengthOf(0);

        results = await new Promise(function(resolve) {
            objs = spaceProvider.search({
                rect: {minLon: 4.718062700195333, minLat: 45.54142036819957, maxLon: 5.138976396484395, maxLat: 45.905733172453694},
                remote: true,
                onload: resolve
            });
        });
        expect(objs).to.have.lengthOf(0);
        expect(results).to.have.lengthOf(0);
    });

    it('set another tag and validate objects in a rectangle again', async function() {
        var objs;
        results = await new Promise(function(resolve) {
            spaceProvider.setTags('soccer');

            objs = spaceProvider.search({
                rect: {minLon: 4.718062700195333, minLat: 45.54142036819957, maxLon: 5.138976396484395, maxLat: 45.905733172453694},
                remote: true,
                onload: resolve
            });
        });
        expect(objs).to.equal(undefined);
        expect(results).to.have.lengthOf(2);

        results = await new Promise(function(resolve) {
            objs = spaceProvider.search({
                rect: {minLon: 4.718062700195333, minLat: 45.54142036819957, maxLon: 5.138976396484395, maxLat: 45.905733172453694},
                remote: true,
                onload: resolve
            });
        });
        expect(objs).to.have.lengthOf(2);
        expect(results).to.have.lengthOf(2);
    });
});
