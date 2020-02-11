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
import {editorTests, displayTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './drawingmanager_events_spec.json';

describe('mouse events when drawingmanager is active', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.26345, latitude: 13.04889},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
    });

    after(async function() {
        editor.destroy();
        display.destroy();
    });

    it('start drawing manager and validate pointup dragstart dragstop events', async function() {
        let mapContainer = display.getContainer();
        editor.getDrawingBoard().start();

        let listener = new testUtils.Listener(editor, ['pointerup', 'dragStart', 'dragStop']);

        // click to add a shape
        await testUtils.events.mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 200});
        await testUtils.events.click(mapContainer, 200, 200);

        // click to add another shape
        await testUtils.events.mousemove(mapContainer, {x: 200, y: 200}, {x: 300, y: 200});
        await testUtils.events.click(mapContainer, 300, 200);

        // drag shape point
        await testUtils.events.drag(mapContainer, {x: 300, y: 200}, {x: 250, y: 100});

        // click on one shape point
        await testUtils.events.click(mapContainer, 200, 200);

        // drag map
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 300, y: 400}, {x: 250, y: 400});
        });

        editor.getDrawingBoard().cancel();

        let results = listener.stop();

        expect(results.pointerup).to.have.lengthOf(2);
        expect(results.dragStart).to.have.lengthOf(0);
        expect(results.dragStop).to.have.lengthOf(0);
    });
});
