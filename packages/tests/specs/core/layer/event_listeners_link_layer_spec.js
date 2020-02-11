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

import {testUtils, prepare} from 'hereTest';
import dataset from './event_listeners_link_layer_spec.json';

describe('event listeners in link layer', function() {
    const expect = chai.expect;

    var preparedData;
    var linkLayer;
    var linkProvider;
    var link1;
    var link2;

    before(async function() {
        preparedData = await prepare(dataset);
        linkLayer = preparedData.getLayers('linkLayer');
        linkProvider = linkLayer.getProvider();

        let results = await new Promise((resolve) => {
            linkLayer.search({
                point: {longitude: 73.42605, latitude: 17.89042},
                radius: 50,
                remote: true,
                onload: resolve
            });
        });
        expect(results).to.have.lengthOf(4);

        link1 = preparedData.getFeature('linkLayer', -9123);
        link2 = preparedData.getFeature('linkLayer', -9124);
    });

    after(async function() {
        await preparedData.clear();
    });

    it('validate an link feature exists', function() {
        let obj = linkProvider.exists({id: link1.id});

        expect(obj.feature).to.deep.include({
            id: link1.id,
            type: 'Feature'
        });
    });

    it('validate remove event', function() {
        let test = new testUtils.Listener(linkLayer, 'featureRemove');

        let a = linkLayer.removeFeature({id: link1.id});

        let results = test.stop();

        expect(results.featureRemove[0]).to.deep.include({
            id: link1.id,
            type: 'Feature'
        });
    });

    it('validate add remove and modify events', function() {
        let test = new testUtils.Listener(linkLayer, ['featureAdd', 'featureRemove', 'featureCoordinatesChange']);

        linkLayer.addFeature({
            geometry: {
                coordinates: [[73.425542163, 17.890502248, 0], [73.426006185, 17.890688581, 0]],
                type: 'LineString'
            },
            type: 'Feature',
            id: 'abc',
            properties: {
                direction: 'B'
            }
        });

        linkLayer.modifyFeatureCoordinates(
            {
                id: link2.id,
                geometry: {
                    // coordinates: [[49.97183, 8.2691, 0], [49.97195, 8.26949, 0]]
                }
            },
            [[73.426166081, 17.890420526, 0], [73.426191257, 17.890142343, 0]],
        );

        let results = test.stop();

        expect(results.featureAdd).to.have.lengthOf(1);
        expect(results.featureRemove).to.have.lengthOf(0);
        expect(results.featureCoordinatesChange).to.have.lengthOf(1);

        expect(results.featureAdd[0]).to.deep.include({
            id: 'abc',
            type: 'Feature'
        });

        expect(results.featureCoordinatesChange[0]).to.deep.include({
            id: link2.id,
            type: 'Feature'
        });

        linkLayer.removeFeature({
            type: 'Feature',
            id: 'abc'
        });
    });
});
