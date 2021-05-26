/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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

import {waitForViewportReady} from 'displayUtils';
import {MonitorXHR, prepare} from 'utils';
import {Map} from '@here/xyz-maps-display';
import dataset from './init_requests_spec.json';

describe('initial requests of display', function() {
    const expect = chai.expect;

    let preparedData;
    let display;
    let requests;

    before(async function() {
        preparedData = await prepare(dataset);
    });

    after(async function() {
        display && display.destroy();
    });

    it('initialize display and validate there are 3 requests sent', async function() {
        let monitor = new MonitorXHR();
        monitor.start();
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 74.17035879069607, latitude: 15.482777312100069},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });

        await waitForViewportReady(display);

        requests = monitor.stop({method: 'all'});

        // two tile requests and one space request.
        expect(requests).to.have.lengthOf(3);
    });
});
