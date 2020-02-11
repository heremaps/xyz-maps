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
import dataset from './map_listener_mousemove_spec.json';

describe('map mousemove listener', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.66629, latitude: 11.86789},
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

    it('validate pointerenter and pointerleave listener', async function() {
        // click on map
        await testUtils.events.click(mapContainer, 275, 155);
        await testUtils.events.mousemove(mapContainer, {x: 275, y: 155}, {x: 260, y: 139});

        let listener = new testUtils.Listener(editor, ['pointerenter', 'pointerleave']);

        // click on link
        await testUtils.events.click(mapContainer, 290, 139);

        // click on map
        await testUtils.events.click(mapContainer, 275, 155);

        // mouse over a link
        await testUtils.events.mousemove(mapContainer, {x: 275, y: 155}, {x: 289, y: 139});

        // mouse out of a link
        await testUtils.events.mousemove(mapContainer, {x: 290, y: 139}, {x: 32, y: 155});

        // mouse over a POI
        await testUtils.events.mousemove(mapContainer, {x: 210, y: 207}, {x: 213, y: 226});

        // mouse out of a poi
        await testUtils.events.mousemove(mapContainer, {x: 213, y: 226}, {x: 210, y: 207});

        let results = listener.stop();

        expect(results.pointerenter).to.have.lengthOf(2);
        expect(results.pointerleave).to.have.lengthOf(2);
    });
});
