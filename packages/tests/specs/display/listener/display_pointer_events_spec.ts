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
import {Listener, prepare, waitForPointerEvent} from 'utils';
import {mousemove} from 'triggerEvents';
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import dataset from './display_pointer_events_spec.json';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('validate pointer events', function() {
    let preparedData;
    let display;
    let mapContainer;
    let pa;
    let listener: Listener;

    beforeEach(async function() {
        listener = undefined;
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.01133868832176, latitude: 20.284701029331405},
            zoomlevel: 19,
            layers: preparedData.getLayers()
        });

        await waitForViewportReady(display);

        mapContainer = display.getContainer();
        pa = preparedData.getFeature('paLayer', -10791);
    });

    afterEach(async function() {
        listener?.stop();
        display.destroy();

        await preparedData.clear();
    });

    it('validate pointenter and pointerleave events', async function() {
        await mousemove(mapContainer, {x: 100, y: 200}, {x: 540, y: 300});

        listener = new Listener(display, ['pointerenter', 'pointerleave']);

        await waitForPointerEvent(display, 'pointerenter', () =>
            mousemove(mapContainer, {x: 540, y: 300}, {x: 483, y: 352}));
        await waitForPointerEvent(display, 'pointerleave', () =>
            mousemove(mapContainer, {x: 483, y: 352}, {x: 540, y: 300}));

        let results = listener.stop();

        expect(results.pointerenter).toHaveLength(1);
        expect(results.pointerleave).toHaveLength(1);
    });

    it('validate pointdown and pointerup events', async function() {
        listener = new Listener(display, ['pointerdown', 'pointerup']);

        await userEvent.click(mapContainer, {position: {x: 456, y: 352}, modifiers: ['Alt']});

        let results = listener.stop();

        expect(results.pointerdown).toHaveLength(1);
        expect(results.pointerdown[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 456,
            mapY: 352,
            type: 'pointerdown'
        }));
        expect(results.pointerdown[0].target).toEqual(expect.objectContaining({
            id: pa.id
        }));
        expect(results.pointerup).toHaveLength(1);
        expect(results.pointerup[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 456,
            mapY: 352,
            type: 'pointerup'
        }));
        expect(results.pointerup[0].target).toEqual(expect.objectContaining({
            id: pa.id
        }));
    });

    it('dispatch pointer down and up on empty map ground', async function() {
        listener = new Listener(display, ['pointerdown', 'pointerup']);

        await userEvent.click(mapContainer, {position: {x: 788, y: 352}, modifiers: ['Alt']});

        let results = listener.stop();

        expect(results.pointerdown).toHaveLength(1);
        expect(results.pointerup).toHaveLength(1);
        expect(results.pointerdown[0].target).toBeUndefined();
        expect(results.pointerup[0].target).toBeUndefined();
    });
});
