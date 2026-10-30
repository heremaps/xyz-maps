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
import {drag} from 'triggerEvents';
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './editor-drag-after-click.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Editor drag after click', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.50973515846258, latitude: 11.965889086900376},
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

    it('drag after click on poi and validate events', async function() {
        let listener = new Listener(editor, ['pointerup', 'dragStart', 'dragStop']);

        // click on poi
        await userEvent.click(mapContainer, {position: {x: 165, y: 324}, modifiers: ['Alt']});

        // click on another poi
        await userEvent.click(mapContainer, {position: {x: 257, y: 337}, modifiers: ['Alt']});

        // click the poi
        await drag(mapContainer, {x: 257, y: 337}, {x: 357, y: 337});

        // click on the clicked poi
        await userEvent.click(mapContainer, {position: {x: 165, y: 324}, modifiers: ['Alt']});

        // click on dragged poi
        await userEvent.click(mapContainer, {position: {x: 357, y: 337}, modifiers: ['Alt']});

        let results = listener.stop();

        expect(results.pointerup).toHaveLength(4);
        expect(results.pointerup[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 165,
            mapY: 324,
            type: 'pointerup'
        }));
        expect(results.pointerup[1]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 257,
            mapY: 337,
            type: 'pointerup'
        }));
        expect(results.pointerup[2]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 165,
            mapY: 324,
            type: 'pointerup'
        }));
        expect(results.pointerup[3]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 357,
            mapY: 337,
            type: 'pointerup'
        }));

        expect(results.dragStart).toHaveLength(1);
        expect(results.dragStop).toHaveLength(1);
    });
});
