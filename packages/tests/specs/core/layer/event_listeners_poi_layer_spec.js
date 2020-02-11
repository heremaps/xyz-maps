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

import {prepare, testUtils} from 'hereTest';
import dataset from './event_listeners_poi_layer_spec.json';

describe('event listeners in poi layer', function() {
    const expect = chai.expect;

    var preparedData;
    var placeLayer;
    var placeProvider;
    var place1;
    var place2;

    before(async function() {
        preparedData = await prepare(dataset);
        placeLayer = preparedData.getLayers('placeLayer');
        placeProvider = placeLayer.getProvider();

        await new Promise((resolve) =>{
            placeLayer.search({
                point: {longitude: -88.77912, latitude: 36.16015},
                radius: 500,
                remote: true,
                onload: resolve
            });
        });

        place1 = preparedData.getFeature('placeLayer', -9118);
        place2 = preparedData.getFeature('placeLayer', -9119);
    });

    after(async function() {
        await preparedData.clear();
    });

    it('validate remove feature event', function() {
        let obj = placeProvider.exists({id: place1.id});

        expect(obj.feature).to.deep.include({
            id: place1.id,
            type: 'Feature'
        });
    });

    it('start event listener', function() {
        let listener = new testUtils.Listener(placeLayer, 'featureRemove');

        placeLayer.removeFeature({
            type: 'Feature',
            id: place1.id
        });

        let results = listener.stop();

        expect(results.featureRemove[0]).to.deep.include({
            id: place1.id,
            type: 'Feature'
        });
    });


    it('start add, remove and modify event', function() {
        let listener = new testUtils.Listener(placeLayer, ['featureAdd', 'featureRemove', 'featureCoordinatesChange']);

        placeLayer.addFeature({
            geometry: {
                coordinates: [79.94556379306937, 12.955867528276273, 0],
                type: 'Point'
            },
            type: 'Feature',
            id: 'abcpoi',
            properties: {
                type: 'hotel',
                routingPoint: [79.9455691574874, 12.95738052826902, 0]
            }
        });

        placeLayer.modifyFeatureCoordinates(
            {
                id: place2.id,
                geometry: {
                    // coordinates: [[49.97183, 8.2691, 0], [49.97195, 8.26949, 0]]
                }
            },
            [79.94418050205374, 12.956967528276273, 0]
        );

        let results = listener.stop();

        expect(results.featureAdd).to.have.lengthOf(1);
        expect(results.featureRemove).to.have.lengthOf(0);
        expect(results.featureCoordinatesChange).to.have.lengthOf(1);

        expect(results.featureAdd[0]).to.deep.include({
            id: 'abcpoi',
            type: 'Feature'
        });

        expect(results.featureCoordinatesChange[0]).to.deep.include({
            id: place2.id,
            type: 'Feature'
        });

        placeLayer.removeFeature({
            type: 'Feature',
            id: 'abcpoi'
        });
    });
});
