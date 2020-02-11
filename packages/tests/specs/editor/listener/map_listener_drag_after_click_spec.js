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
import dataset from './map_listener_drag_after_click_spec.json';

describe('map events, click objects after dragging', function() {
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

    it('drag after click on poi and validate events', async function() {
        let listener = new testUtils.Listener(editor, ['pointerup', 'dragStart', 'dragStop']);

        // click on poi
        await testUtils.events.click(mapContainer, 165, 324);

        // click on another poi
        await testUtils.events.click(mapContainer, 257, 337);

        // click the poi
        await testUtils.events.drag(mapContainer, {x: 257, y: 337}, {x: 357, y: 337});

        // click on the clicked poi
        await testUtils.events.click(mapContainer, 165, 324);

        // click on dragged poi
        await testUtils.events.click(mapContainer, 357, 337);

        let results = listener.stop();

        expect(results.pointerup).to.have.lengthOf(4);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 165,
            mapY: 324,
            type: 'pointerup'
        });
        expect(results.pointerup[1]).to.deep.include({
            button: 0,
            mapX: 257,
            mapY: 337,
            type: 'pointerup'
        });
        expect(results.pointerup[2]).to.deep.include({
            button: 0,
            mapX: 165,
            mapY: 324,
            type: 'pointerup'
        });
        expect(results.pointerup[3]).to.deep.include({
            button: 0,
            mapX: 357,
            mapY: 337,
            type: 'pointerup'
        });

        expect(results.dragStart).to.have.lengthOf(1);
        expect(results.dragStop).to.have.lengthOf(1);
    });
});
