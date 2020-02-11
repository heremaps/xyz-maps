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
import {editorTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './drawingmanager_create_cancel_and_destroy_editor_display.json';

describe('Drawing manager create or cancel drawing and then destroy editor and display', function() {
    const expect = chai.expect;

    it('Create a link with drawing manager and then destroy editor and display', async function() {
        // instanciate display and editor
        let preparedData = await prepare(dataset);
        let display = new Map(document.getElementById('map'), {
            center: {longitude: 77.26345, latitude: 13.04889},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        let editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        let mapContainer = display.getContainer();

        editor.getDrawingBoard().start();

        await testUtils.events.mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 200});
        await testUtils.events.click(mapContainer, 200, 200);

        await testUtils.events.mousemove(mapContainer, {x: 200, y: 200}, {x: 200, y: 300});
        await testUtils.events.click(mapContainer, 200, 300);

        editor.getDrawingBoard().create({featureClass: 'NAVLINK'});

        editor.destroy();
        display.destroy();
    });

    it('Cancel drawing and destroy editor and displays', async function() {
        // instanciate display and editor
        let preparedData = await prepare(dataset);
        let display = new Map(document.getElementById('map'), {
            center: {longitude: 77.26345, latitude: 13.04889},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        let editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        let mapContainer = display.getContainer();

        editor.getDrawingBoard().start();

        await testUtils.events.mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 200});
        await testUtils.events.click(mapContainer, 200, 200);

        await testUtils.events.mousemove(mapContainer, {x: 200, y: 200}, {x: 200, y: 300});
        await testUtils.events.click(mapContainer, 200, 300);

        editor.getDrawingBoard().cancel();

        editor.destroy();
        display.destroy();
    });
});
