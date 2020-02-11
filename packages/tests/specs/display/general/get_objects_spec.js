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

import {displayTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import dataset from './get_objects_spec.json';

describe('get objects', function() {
    const expect = chai.expect;

    let preparedData;
    let display;
    let link;

    before(async function() {
        preparedData = await prepare(dataset);

        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        await displayTests.waitForViewportReady(display);

        link = preparedData.getFeature('linkLayer', 1003913693);
    });

    after(async function() {
        display.destroy();
        await preparedData.clear();
    });

    it('validate getFeatureAt', async function() {
        let o = display.getFeatureAt({x: 10, y: 10});
        expect(o).to.equal(undefined);
    });


    it('validate getFeatureAt at a difference place', async function() {
        let o = display.getFeatureAt({x: 298, y: 183});

        expect(o.feature).to.deep.include({id: link.id});
        expect(o.layer).to.deep.include({name: 'Link Layer'});
        expect(o.features).to.have.lengthOf(1);
    });


    it('validate getFeatureAt at a difference place after moving map to another place', async function() {
        await displayTests.waitForViewportReady(display, ()=>{
            display.setCenter({
                longitude: 76.75926261624988,
                latitude: 12.836190489456936
            });
        });

        let o = display.getFeatureAt({x: 411, y: 316});
        expect(o.layer).to.deep.include({name: 'Address Layer'});
        expect(o.features).to.have.lengthOf(1);
    });
});
