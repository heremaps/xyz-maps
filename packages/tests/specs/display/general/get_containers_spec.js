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

import {displayTests, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import dataset from './get_containers_spec.json';

describe('validate map container', function() {
    const expect = chai.expect;

    let display;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
    });

    after(async function() {
        display.destroy();
    });

    it('validate map containers', function() {
        expect(display.getContainer().id).to.equal('map');

        expect(display.getContainer().style).to.deep.include({
            'z-index': '',
            'height': '',
            'width': '',
            'position': ''
        });
    });


    it('validate map containers again after moving map', async function() {
        await displayTests.waitForViewportReady(display, ()=>{
            display.setCenter({longitude: 77.79851889087672, latitude: 12.623621436440137});
        });

        expect(display.getContainer().id).to.equal('map');

        expect(display.getContainer().style).to.deep.include({
            'z-index': '',
            'height': '',
            'width': '',
            'position': ''
        });
    });
});
