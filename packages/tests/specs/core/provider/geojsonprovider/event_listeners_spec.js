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
import dataset from './event_listeners_spec.json';

describe('event listeners in provider layer', function() {
    const expect = chai.expect;
    var poiProvider;

    before(async function() {
        let preparedData = await prepare(dataset);
        let poiLayer = preparedData.getLayers('placeGeoJsonLayer');
        poiProvider = poiLayer.getProvider();
    });


    it('add and remove feature and validate add and remove events', function() {
        let listener = new testUtils.Listener(poiProvider, ['featureAdd', 'featureRemove']);

        poiProvider.addFeature({
            geometry: {
                coordinates: [79.94556379306937, 12.956967528276273, 0],
                type: 'Point'
            },
            type: 'Feature',
            id: 'abc',
            properties: {
                routingLink: '872898378',
                routingPoint: [79.9455691574874, 12.95738052826902, 0]
            }
        });

        let evts = listener.stop();

        expect(evts.featureAdd[0]).to.deep.include({id: 'abc'});
        expect(evts.featureRemove).to.have.lengthOf(0);


        let listener2 = new testUtils.Listener(poiProvider, ['featureAdd', 'featureRemove']);

        poiProvider.removeFeature({
            type: 'Feature',
            id: 'abc'
        });


        let evt = listener2.stop();

        expect(evt.featureRemove[0]).to.deep.include({id: 'abc'});
        expect(evt.featureAdd).to.have.lengthOf(0);
    });
});
