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
import {prepare} from 'utils';
import {click} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import dataset from './disable_zoomcontrol_spec.json';

describe('ui component compass', function() {
    const expect = chai.expect;
    const MAX_PITCH = 48;
    const INITIAL_PITCH = 10;
    let preparedData;
    let display;
    let mapContainer;

    before(async function() {
        preparedData = await prepare(dataset);
        mapContainer = document.getElementById('map');
        display = new Map(mapContainer, {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomlevel: 18,
            layers: preparedData.getLayers(),
            behavior: {
                pitch: true
            },
            pitch: INITIAL_PITCH,
            maxPitch: MAX_PITCH
        });
    });

    after(async function() {
        if (display.destroy) {
            display.destroy();
        }
    });

    it('validate initial pitch is set', async function() {
        expect(display.pitch()).to.equal(INITIAL_PITCH);
    });

    it('validate pitch resets on click', async function() {
        await waitForViewportReady(display, () => {
            // click zoom control to zoom in
            click(mapContainer, 765, 490);
        });
        expect(display.pitch()).to.equal(0);
    });

    it('validate is set to maxpitch on click', async function() {
        await waitForViewportReady(display, () => {
            // click zoom control to zoom in
            click(mapContainer, 765, 490);
        });
        expect(display.pitch()).to.equal(MAX_PITCH);
    });

    it('re-initialize display with compass disabled and validate', async function() {
        display.destroy();
        display = new Map(document.getElementById('map'), {
            UI: {
                Compass: false
            },
            zoomlevel: 18,
            layers: preparedData.getLayers(),
            behavior: {
                pitch: true
            },
            pitch: INITIAL_PITCH,
            maxPitch: MAX_PITCH
        });

        await waitForViewportReady(display, () => {
            // click the position where compass control was
            click(mapContainer, 765, 490);
        });
        expect(display.pitch()).to.equal(INITIAL_PITCH);
    });

    it('re-initialize display with compass enabled, check initial rotation and pitch again', async function() {
        display.destroy();
        display = new Map(document.getElementById('map'), {
            UI: {
                Compass: true
            },
            zoomlevel: 18,
            layers: preparedData.getLayers(),
            behavior: {
                pitch: true,
                rotate: true
            },
            rotate: 45,
            pitch: INITIAL_PITCH,
            maxPitch: MAX_PITCH
        });
        expect(display.rotate()).to.equal(45);
        expect(display.pitch()).to.equal(INITIAL_PITCH);
    });

    it('validate compass is active and click rests rotation and pitch', async function() {
        await waitForViewportReady(display, () => {
            click(mapContainer, 765, 490);
        });

        expect(display.rotate()).to.equal(0);
        expect(display.pitch()).to.equal(0);
    });

    it('destroy display while animation is running', async () => {
        await click(mapContainer, 765, 490);
        display.destroy();
    });
});
