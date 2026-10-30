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
import {prepare} from 'utils';
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import dataset from './zoom-control-visibility.json';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('Compass', function() {
    const MAX_PITCH = 48;
    const INITIAL_PITCH = 10;
    let preparedData;
    let display;
    let mapContainer;

    beforeEach(async function() {
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
        await waitForViewportReady(display);
    });

    afterEach(async function() {
        if (display.destroy) {
            display.destroy();
        }
    });

    it('validate initial pitch is set', async function() {
        expect(display.pitch()).toBe(INITIAL_PITCH);
    });

    it('validate pitch resets on click', async function() {
        await waitForViewportReady(display, async () => {
            await userEvent.click(mapContainer, {position: {x: 765, y: 490}, modifiers: ['Alt']});
            await expect.poll(() => display.pitch(), {timeout: 2000}).toBe(0);
        });
        expect(display.pitch()).toBe(0);
    });

    it('validate is set to maxpitch on click', async function() {
        await waitForViewportReady(display, () => display.pitch(0));
        await waitForViewportReady(display, async () => {
            await userEvent.click(mapContainer, {position: {x: 765, y: 490}, modifiers: ['Alt']});
            await expect.poll(() => display.pitch(), {timeout: 2000}).toBe(MAX_PITCH);
        });
        expect(display.pitch()).toBe(MAX_PITCH);
    });

    it('re-initialize display with compass disabled and validate', async function() {
        display.destroy();
        display = new Map(document.getElementById('map'), {
            ui: {
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

        await waitForViewportReady(display, async () => {
            // click the position where compass control was
            await userEvent.click(mapContainer, {position: {x: 765, y: 490}, modifiers: ['Alt']});
        });
        expect(display.pitch()).toBe(INITIAL_PITCH);
    });

    it('re-initialize display with compass enabled, check initial rotation and pitch again', async function() {
        display.destroy();
        display = new Map(document.getElementById('map'), {
            ui: {
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
        expect(display.rotate()).toBe(45);
        expect(display.pitch()).toBe(INITIAL_PITCH);
    });

    it('validate compass is active and click rests rotation and pitch', async function() {
        await waitForViewportReady(display, () => display.rotate(45));
        await waitForViewportReady(display, async () => {
            await userEvent.click(mapContainer, {position: {x: 765, y: 490}, modifiers: ['Alt']});
            await expect.poll(() => [display.rotate(), display.pitch()], {timeout: 2000}).toStrictEqual([0, 0]);
        });

        expect(display.rotate()).toBe(0);
        expect(display.pitch()).toBe(0);
    });

    it('destroy display while animation is running', async () => {
        await userEvent.click(mapContainer, {position: {x: 765, y: 490}, modifiers: ['Alt']});
        display.destroy();
    });

    it('stops compass animations after repeated clicks when destroyed', async () => {
        display.destroy();
        display = new Map(mapContainer, {
            ui: {Compass: true},
            zoomlevel: 18,
            layers: [],
            rotate: 45,
            pitch: INITIAL_PITCH
        });
        await waitForViewportReady(display);

        const errors: string[] = [];
        const onError = (event: ErrorEvent) => errors.push(event.message);
        window.addEventListener('error', onError);
        try {
            await userEvent.click(mapContainer, {position: {x: 765, y: 490}, modifiers: ['Alt']});
            await userEvent.click(mapContainer, {position: {x: 765, y: 490}, modifiers: ['Alt']});
            display.destroy();

            // Allow pending animation frames to expose callbacks against the destroyed map.
            await new Promise<void>((resolve) => setTimeout(resolve, 200));
            expect(errors).toStrictEqual([]);
        } finally {
            window.removeEventListener('error', onError);
            if (display.destroy) display.destroy();
        }
    });
});
