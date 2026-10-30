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
import {drag, mousemove} from 'triggerEvents';
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './drawing-board-events.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Drawing board events', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.26345, latitude: 13.04889},
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
    });

    it('start drawing manager and validate pointup dragstart dragstop events', async function() {
        let mapContainer = display.getContainer();
        editor.getDrawingBoard().start();

        let listener = new Listener(editor, ['pointerup', 'dragStart', 'dragStop']);

        // click to add a shape
        await mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 200});
        await userEvent.click(mapContainer, {position: {x: 200, y: 200}, modifiers: ['Alt']});

        // click to add another shape
        await mousemove(mapContainer, {x: 200, y: 200}, {x: 300, y: 200});
        await userEvent.click(mapContainer, {position: {x: 300, y: 200}, modifiers: ['Alt']});

        // drag shape point
        await drag(mapContainer, {x: 300, y: 200}, {x: 250, y: 100});

        // click on one shape point
        await userEvent.click(mapContainer, {position: {x: 200, y: 200}, modifiers: ['Alt']});

        // drag map
        await waitForEditorReady(editor, async ()=>{
            await drag(mapContainer, {x: 300, y: 400}, {x: 250, y: 400});
        });

        editor.getDrawingBoard().cancel();

        let results = listener.stop();

        expect(results.pointerup).toHaveLength(2);
        expect(results.dragStart).toHaveLength(0);
        expect(results.dragStop).toHaveLength(0);
    });
});
