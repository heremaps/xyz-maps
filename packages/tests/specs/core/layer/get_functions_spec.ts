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
import dataset from './get_functions_spec.json';

describe('get functions', function() {
    const expect = chai.expect;

    var preparedData;
    var addrLayer;
    var results;

    before(async function() {
        preparedData = await prepare(dataset);
        addrLayer = preparedData.getLayers('addressLayer');

        await new Promise<void>((resolve) =>{
            addrLayer.search({
                point: {longitude: -121.213991, latitude: 37.646223},
                radius: 50,
                remote: true,
                onload: function(e) {
                    results = e;
                    resolve();
                }
            });
        });
    });

    after(async function() {
        await preparedData.clear();
    });

    it('validate object from callback function', function() {
        expect(results.length).to.be.above(0);

        expect(addrLayer.getCachedTile('02301023110211')).to.deep.include({
            quadkey: '02301023110211',
            z: 14,
            x: 2675,
            y: 6340
        });
        expect(addrLayer.getProvider()).to.deep.include({
            name: 'Address',
            margin: 20
        });
    });
});
