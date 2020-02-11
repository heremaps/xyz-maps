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
import dataset from './map_listener_mouseenter_link_spec.json';

describe('map mouseenter link when link layer is removed', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    let linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.38670452269983, latitude: 11.927986024207911},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate mouse hover events', async function() {
        // click on map
        await testUtils.events.click(mapContainer, 150, 100);
        await testUtils.events.mousemove(mapContainer, {x: 150, y: 100}, {x: 200, y: 100});

        let listener = new testUtils.Listener(editor, ['pointerenter', 'pointerleave']);

        // click on link
        await testUtils.events.click(mapContainer, 330, 167);

        // click on map
        await testUtils.events.click(mapContainer, 350, 132);

        // mouse over a link
        await testUtils.events.mousemove(mapContainer, {x: 350, y: 132}, {x: 330, y: 167});

        // mouse out of a link
        await testUtils.events.mousemove(mapContainer, {x: 330, y: 167}, {x: 360, y: 132});

        // mouse over a POI
        await testUtils.events.mousemove(mapContainer, {x: 300, y: 132}, {x: 285, y: 146});

        // mouse out of a poi
        await testUtils.events.mousemove(mapContainer, {x: 285, y: 146}, {x: 285, y: 130});

        let results = listener.stop();

        expect(results.pointerenter).to.have.lengthOf(2);
        expect(results.pointerleave).to.have.lengthOf(2);
    });

    it('remove link layer, validate mouse hover events', async function() {
        editor.removeLayer(linkLayer);

        let listener = new testUtils.Listener(editor, ['pointerenter', 'pointerleave']);

        // click on link
        await testUtils.events.click(mapContainer, 330, 167);

        // click on map
        await testUtils.events.click(mapContainer, 350, 132);

        // mouse over a link
        await testUtils.events.mousemove(mapContainer, {x: 350, y: 132}, {x: 330, y: 167});

        // mouse out of a link
        await testUtils.events.mousemove(mapContainer, {x: 330, y: 167}, {x: 360, y: 132});

        // mouse over a POI
        await testUtils.events.mousemove(mapContainer, {x: 300, y: 132}, {x: 285, y: 146});

        // mouse out of a poi
        await testUtils.events.mousemove(mapContainer, {x: 285, y: 146}, {x: 285, y: 130});

        let results = listener.stop();

        expect(results.pointerenter).to.have.lengthOf(1);
        expect(results.pointerleave).to.have.lengthOf(1);
    });


    it('add link layer, validate mouse hover events', async function() {
        editor.addLayer(linkLayer);

        let listener = new testUtils.Listener(editor, ['pointerenter', 'pointerleave']);

        // click on link
        await testUtils.events.click(mapContainer, 330, 167);

        // click on map
        await testUtils.events.click(mapContainer, 350, 132);

        // mouse over a link
        await testUtils.events.mousemove(mapContainer, {x: 350, y: 132}, {x: 330, y: 167});

        // mouse out of a link
        await testUtils.events.mousemove(mapContainer, {x: 330, y: 167}, {x: 360, y: 132});

        // mouse over a POI
        await testUtils.events.mousemove(mapContainer, {x: 300, y: 132}, {x: 285, y: 146});

        // mouse out of a poi
        await testUtils.events.mousemove(mapContainer, {x: 285, y: 146}, {x: 285, y: 130});

        let results = listener.stop();

        expect(results.pointerenter).to.have.lengthOf(2);
        expect(results.pointerleave).to.have.lengthOf(2);
    });
});
