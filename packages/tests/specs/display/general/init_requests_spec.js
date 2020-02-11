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
import dataset from './init_requests_spec.json';

describe('initial requests of display', function() {
    const expect = chai.expect;

    let display;
    let requests;

    before(async function() {
        let preparedData = await prepare(dataset);

        let monitor = new testUtils.MonitorXHR();

        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 74.17035879069607, latitude: 15.482777312100069},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });

        await displayTests.waitForViewportReady(display);

        requests = monitor.stop({method: 'all'});
    });

    after(async function() {
        display.destroy();
    });

    it('validate there are 3 requests sent', async function() {
        // two tile requests and one space request.
        expect(requests).to.have.lengthOf(3);
    });
});
