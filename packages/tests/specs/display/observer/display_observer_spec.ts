/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
import {Observer, prepare} from 'utils';
import {Map} from '@here/xyz-maps-display';
import dataset from './display_observer_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('map observer', function() {
    let display;

    beforeAll(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.003685005, latitude: 20.272390425},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
    });

    afterAll(async function() {
        display.destroy();
    });

    it('set map center and validate observer', async function() {
        let observer = new Observer(display, 'center');

        await waitForViewportReady(display, ()=>{
            display.setCenter({
                longitude: 80.241128629,
                latitude: 15.6931352023
            });
        });

        await waitForViewportReady(display, ()=>{
            display.setCenter({
                longitude: 80.042093977,
                latitude: 15.494536519
            });
        });

        let results = observer.stop();
        expect(results.center[0]).toEqualWithTolerance({longitude: 80.241128629, latitude: 15.6931352023}, 1e-7);
        expect(results.center[1]).toEqualWithTolerance({longitude: 80.042093977, latitude: 15.494536519}, 1e-7);
    });

    it('set map center with same coord and validate observer again', async function() {
        display.setCenter({
            longitude: 80.0420939774,
            latitude: 15.4945365192
        });

        let observer = new Observer(display, 'center');

        display.setCenter({
            longitude: 80.0420939774,
            latitude: 15.4945365192
        });

        let results = observer.stop();
        expect(results.center).toHaveLength(0);
    });


    it('set zoomlevel and validate observer', async function() {
        let observer = new Observer(display, 'zoomlevel');

        await waitForViewportReady(display, ()=>{
            display.setZoomlevel(19);
        });

        let results = observer.stop();
        expect(results.zoomlevel[0]).toBe(19);
    });
});
