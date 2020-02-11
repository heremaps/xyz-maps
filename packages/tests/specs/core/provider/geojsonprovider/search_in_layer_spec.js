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
import dataset from './search_in_layer_spec.json';

describe('search features in poi layer and provider', function() {
    const expect = chai.expect;

    var preparedFeatures;
    var poiLayer;
    var poiProvider;

    var results;

    before(async function() {
        let preparedData = await prepare(dataset);
        poiLayer = preparedData.getLayers('placeGeoJsonLayer');
        poiProvider = poiLayer.getProvider();
    });

    it('search in poi layer by feature id', function() {
        // make a local search with a single id and validate the expected feature is returned
        let objs = poiLayer.search({id: '-30223'});

        expect(objs).to.include({id: -30223, type: 'Feature'});
    });

    it('search in poi layer by feature id', function() {
        // make a local search with a single id again and validate expected feature is returned
        let objs = poiLayer.search({id: '-31443'});

        expect(objs).to.include({id: -31443, type: 'Feature'});
    });


    it('get poi provider and search by feature ids', function() {
        // make a local search with two ids
        let objs = poiProvider.search({ids: ['-31366', '-30710']});

        expect(objs[0]).to.include({id: -31366, type: 'Feature'});
        expect(objs[1]).to.include({id: -30710, type: 'Feature'});
    });

    it('search by point and radius in poi provider', function() {
        let objs = poiProvider.search({
            point: {longitude: -97.278771473316, latitude: 37.679044962948},
            radius: 80
        });

        expect(objs).to.have.lengthOf(6);
    });

    it('search in provider by rect', function() {
        let objs = poiProvider.search({
            rect: {minLon: -97.2876892, maxLat: 37.675575, maxLon: -97.283927, minLat: 37.6731911}
        });

        expect(objs).to.have.lengthOf(13);
    });

    it('search in provider by rect again', function() {
        let objs = poiProvider.search({
            rect: {minLon: -97.27616439, maxLat: 37.671016753895, maxLon: -97.273355940327, minLat: 37.67021945}
        });
        expect(objs).to.have.lengthOf(3);
    });

    it('search in provider by rect', function() {
        let objs = poiProvider.search({
            rect: [-97.27616439, 37.67021945, -97.273355940327, 37.671016753895]
        });

        expect(objs).to.have.lengthOf(3);
    });

    it('search in provider by rect again', function() {
        let objs = poiProvider.search({
            rect: [-97.2876892, 37.6731911, -97.283927, 37.675575]
        });

        expect(objs).to.have.lengthOf(13);
    });
});
