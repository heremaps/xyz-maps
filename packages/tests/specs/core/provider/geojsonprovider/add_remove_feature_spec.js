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
import dataset from './add_remove_feature_spec.json';

describe('add and remove features in provider', function() {
    const expect = chai.expect;

    var poiProvider;

    before(async function() {
        let preparedData = await prepare(dataset);

        let poiLayer = preparedData.getLayers('placeGeoJsonLayer');
        poiProvider = poiLayer.getProvider();
    });

    it('search features and validate', function() {
        let obj = poiProvider.search({
            point: {longitude: 46.748524, latitude: 6.77124},
            radius: 100
        });
        expect(obj).to.have.lengthOf(0);
    });

    it('add two features and validate', function() {
        poiProvider.addFeature({
            geometry: {
                coordinates: [46.748524, 6.77124, 0],
                type: 'Point'
            },
            type: 'Feature',
            properties: {
                routingPoint: [46.748324, 6.77124, 0]
            }
        });

        poiProvider.addFeature({
            geometry: {
                coordinates: [46.748534, 6.77124, 0],
                type: 'Point'
            },
            type: 'Feature',
            properties: {
                routingPoint: [46.747324, 6.77124, 0]
            }
        });

        let obj = poiProvider.search({
            point: {longitude: 46.748524, latitude: 6.77124},
            radius: 100
        });
        expect(obj).to.have.lengthOf(2);
    });
});
