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
import dataset from './search_locally_spec.json';

describe('search features in provider by single parameter', function() {
    const expect = chai.expect;
    var preparedData;
    var addressLayer;

    before(async function() {
        preparedData = await prepare(dataset);

        addressLayer = preparedData.getLayers('addressLayer');
    });

    it('search in provider by feature id', function() {
        let obj = addressLayer.search({
            id: '-12432'
        });
        expect(obj).to.deep.include({
            id: -12432,
            type: 'Feature'
        });
    });

    it('search in provider by feature id again', function() {
        let obj = addressLayer.search({
            id: '-12431'
        });
        expect(obj).to.deep.include({
            id: -12431,
            type: 'Feature'
        });
    });

    it('search by point and radius', function() {
        let objs = addressLayer.search({point: {longitude: 79.927917, latitude: 12.963206}, radius: 80});
        expect(objs).to.have.lengthOf(3);
    });


    it('search in provider by rect', function() {
        let objs = addressLayer.search({rect: {minLon: 79.925268, minLat: 12.963451, maxLon: 79.927414, maxLat: 12.964541}});
        expect(objs).to.have.lengthOf(5);
    });


    it('search in provider by rect again', function() {
        let objs = addressLayer.search({rect: {minLon: 79.925848, minLat: 12.964151, maxLon: 79.927994, maxLat: 12.96524}});
        expect(objs).to.have.lengthOf(7);
    });

    it('search in provider by rect again', function() {
        let objs = addressLayer.search({rect: {minLon: 79.925848, minLat: 12.964151, maxLon: 79.927994, maxLat: 12.96524}});
        expect(objs).to.have.lengthOf(7);
    });
});
