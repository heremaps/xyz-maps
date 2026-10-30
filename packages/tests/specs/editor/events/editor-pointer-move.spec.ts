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
import {Listener, prepare, waitForPointerEvent} from 'utils';
import {waitForEditorReady} from 'editorUtils';
import {mousemove} from 'triggerEvents';
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './editor-pointer-move.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Editor pointer move', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.66629, latitude: 11.86789},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        mapContainer = display.getContainer();
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate pointerenter and pointerleave listener', async function() {
        // click on map
        await userEvent.click(mapContainer, {position: {x: 275, y: 155}, modifiers: ['Alt']});
        await mousemove(mapContainer, {x: 275, y: 155}, {x: 260, y: 139});

        // click on link
        await userEvent.click(mapContainer, {position: {x: 290, y: 139}, modifiers: ['Alt']});

        // click on map
        await userEvent.click(mapContainer, {position: {x: 275, y: 155}, modifiers: ['Alt']});

        // Refresh hover after deselection before recording the explicit hover sequence.
        await waitForPointerEvent(display, 'pointermove', () =>
            mousemove(mapContainer, {x: 275, y: 155}, {x: 275, y: 155}));
        let listener = new Listener(editor, ['pointerenter', 'pointerleave']);

        // mouse over a link
        await waitForPointerEvent(editor, 'pointerenter', async () => {
            await userEvent.hover(mapContainer, {position: {x: 289, y: 139}, modifiers: ['Alt']});
        });

        // mouse out of a link
        await waitForPointerEvent(editor, 'pointerleave', async () => {
            await userEvent.hover(mapContainer, {position: {x: 32, y: 155}, modifiers: ['Alt']});
        });

        // mouse over a POI
        await waitForPointerEvent(editor, 'pointerenter', async () => {
            await userEvent.hover(mapContainer, {position: {x: 213, y: 226}, modifiers: ['Alt']});
        });

        // mouse out of a poi
        await waitForPointerEvent(editor, 'pointerleave', async () => {
            await userEvent.hover(mapContainer, {position: {x: 210, y: 207}, modifiers: ['Alt']});
        });

        let results = listener.stop();

        expect(results.pointerenter).toHaveLength(2);
        expect(results.pointerleave).toHaveLength(2);
        const targets = [
            preparedData.getFeature('linkLayer', -189168).id,
            preparedData.getFeature('placeLayer', -29530).id
        ];
        expect(results.pointerenter.map((event) => event.target?.id)).toStrictEqual(targets);
        expect(results.pointerleave.map((event) => event.target?.id)).toStrictEqual(targets);
    });
});
