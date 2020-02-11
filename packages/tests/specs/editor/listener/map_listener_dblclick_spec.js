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
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './map_listener_dblclick_spec.json';

describe('map double click listener', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.50973515846258, latitude: 11.965889086900376},
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
        await preparedData.clear();
    });

    it('start drawingmanager and validate pointup and dbltap events', async function() {
        editor.getDrawingBoard().start();

        let listener = new testUtils.Listener(editor, ['pointerup', 'dbltap']);

        // double click on map
        await testUtils.events.mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 300});
        await testUtils.events.dblclick(mapContainer, 200, 300);

        // double click on POI
        await testUtils.events.mousemove(mapContainer, {x: 300, y: 250}, {x: 350, y: 293});
        await testUtils.events.dblclick(mapContainer, 350, 293);

        // double click on link
        await testUtils.events.mousemove(mapContainer, {x: 50, y: 100}, {x: 90, y: 163});
        await testUtils.events.dblclick(mapContainer, 90, 163);

        // double click on link shape
        await testUtils.events.mousemove(mapContainer, {x: 100, y: 250}, {x: 145, y: 304});
        await testUtils.events.dblclick(mapContainer, 145, 304);

        let results = listener.stop();

        expect(results.pointerup).to.have.lengthOf(4);
        expect(results.dbltap).to.have.lengthOf(0);

        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        editor.getDrawingBoard().cancel();
    });


    it('start drawingmanager and validate pointerup and dbltap', async function() {
        editor.getDrawingBoard().start();

        let listener = new testUtils.Listener(editor, ['pointerup', 'dbltap']);

        // add one shape point by double click
        await testUtils.events.mousemove(mapContainer, {x: 200, y: 200}, {x: 200, y: 300});
        await testUtils.events.dblclick(mapContainer, 200, 300);

        // add one more shape point by double click
        await testUtils.events.mousemove(mapContainer, {x: 300, y: 200}, {x: 300, y: 300});
        await testUtils.events.dblclick(mapContainer, 300, 300);

        let results = listener.stop();
        expect(results.pointerup).to.have.lengthOf(2);
        expect(results.dbltap).to.have.lengthOf(0);

        editor.getDrawingBoard().cancel();
    });
});
