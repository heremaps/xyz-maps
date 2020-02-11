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
import dataset from './search_locally_geojsonprovider_spec.json';

describe('search features in geojson provider by single parameter', function() {
    const expect = chai.expect;

    var preparedData;
    var poiLayer;

    before(async function() {
        preparedData = await prepare(dataset);

        poiLayer = preparedData.getLayers('placeGeoJsonLayer');
    });

    it('search locally by rect', function() {
        let objs = poiLayer.search({rect: {minLon: -118.84209, minLat: 37.57110, maxLon: -118.83351, maxLat: 37.57621}});
        expect(objs).to.have.lengthOf(5);
    });

    it('search locally by rect again', function() {
        let objs = poiLayer.search({rect: {minLon: -118.85709, minLat: 37.56468, maxLon: -118.82276, maxLat: 37.58508}});
        expect(objs).to.have.lengthOf(11);
    });

    it('search locally by rect as array', function() {
        let objs = poiLayer.search({rect: [-118.84209, 37.57110, -118.83351, 37.57621]});
        expect(objs).to.have.lengthOf(5);
    });

    it('search locally by rect again as array', function() {
        let objs = poiLayer.search({rect: [-118.85709, 37.56468, -118.82276, 37.58508]});
        expect(objs).to.have.lengthOf(11);
    });

    it('search locally by feature id', function() {
        let objs = poiLayer.search({id: -13795});
        expect(objs).to.deep.include({id: -13795, type: 'Feature'});
    });

    it('search locally by feature id again', function() {
        let objs = poiLayer.search({id: -8519});
        expect(objs).to.deep.include({id: -8519, type: 'Feature'});
    });

    it('search in provider by two feature ids which do not exist', function() {
        let objs = poiLayer.search({id: ['-1', '-2']});
        expect(objs).to.deep.equal([undefined, undefined]);
    });

    it('search by point and radius', function() {
        let objs = poiLayer.search({point: {longitude: -118.839925, latitude: 37.57488}, radius: 800});
        expect(objs).to.have.lengthOf(7);
    });
});
