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
import {Listener, prepare} from 'utils';
import {waitForEditorReady} from 'editorUtils';
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './editor-click.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Editor click', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.5553, latitude: 13.99646},
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

    it('start listener and validate events', async function() {
        let listener = new Listener(editor, ['pointerup']);

        // lick on Address
        await userEvent.click(mapContainer, {position: {x: 300, y: 260}, modifiers: ['Alt']});

        // click on address navigation point
        await userEvent.click(mapContainer, {position: {x: 300, y: 200}, modifiers: ['Alt']});

        // click on map
        await userEvent.click(mapContainer, {position: {x: 631, y: 324}, modifiers: ['Alt']});

        // click on link
        await userEvent.click(mapContainer, {position: {x: 350, y: 200}, modifiers: ['Alt']});

        // click on link shape point
        await userEvent.click(mapContainer, {position: {x: 400, y: 200}, modifiers: ['Alt']});

        let results = listener.stop();

        expect(results.pointerup).toHaveLength(5);
        expect(results.pointerup[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 300,
            mapY: 260,
            type: 'pointerup'
        }));
        expect(results.pointerup[1]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 300,
            mapY: 200,
            type: 'pointerup'
        }));
        expect(results.pointerup[2]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 631,
            mapY: 324,
            type: 'pointerup'
        }));
        expect(results.pointerup[3]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 350,
            mapY: 200,
            type: 'pointerup'
        }));
        expect(results.pointerup[4]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 400,
            mapY: 200,
            type: 'pointerup'
        }));
    });
});
