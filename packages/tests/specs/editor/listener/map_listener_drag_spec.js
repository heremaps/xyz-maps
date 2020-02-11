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
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './map_listener_drag_spec.json';

describe('map drag listener', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link2;
    let linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.419265, latitude: 11.929277},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link2 = preparedData.getFeature('linkLayer', -189164);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate dragStart and dragStop by draging poi and its routing point', async function() {
        let listener = new testUtils.Listener(editor, ['dragStart', 'dragStop']);

        // click on poi
        await testUtils.events.click(mapContainer, 569, 428);

        // drag poi
        await testUtils.events.drag(mapContainer, {x: 569, y: 428}, {x: 551, y: 408});

        // click the poi
        await testUtils.events.click(mapContainer, 551, 408);

        // drag poi routing point
        await testUtils.events.drag(mapContainer, {x: 546, y: 448}, {x: 570, y: 460});

        let results = listener.stop();

        expect(results.dragStart).to.have.lengthOf(2);
        expect(results.dragStart[0]).to.deep.include({
            button: 0,
            // mapX: 100,
            // mapY: 428,
            type: 'dragStart'
        });
        expect(results.dragStart[1]).to.deep.include({
            button: 0,
            // mapX: 132,
            // mapY: 107,
            type: 'dragStart'
        });

        expect(results.dragStop).to.have.lengthOf(2);
        expect(results.dragStop[0]).to.deep.include({
            button: 0,
            mapX: 551,
            mapY: 408,
            type: 'dragStop'
        });
        expect(results.dragStop[1]).to.deep.include({
            button: 0,
            mapX: 570,
            mapY: 460,
            type: 'dragStop'
        });
    });


    // drag link shape point
    it('validate dragStart and dragStop by draging shape point and middle shape point', async function() {
        let l = editor.getFeature(link2.id, linkLayer);
        l.select();

        let listener = new testUtils.Listener(editor, ['dragStart', 'dragStop']);

        // drag shape point
        await testUtils.events.drag(mapContainer, {x: 180, y: 100}, {x: 180, y: 200});

        // drag middle shape point
        await testUtils.events.drag(mapContainer, {x: 140, y: 150}, {x: 140, y: 190});

        let results = listener.stop();

        expect(results.dragStart).to.have.lengthOf(2);
        expect(results.dragStart[0]).to.deep.include({
            button: 0,
            // mapX: 100,
            // mapY: 428,
            type: 'dragStart'
        });
        expect(results.dragStart[1]).to.deep.include({
            button: 0,
            // mapX: 132,
            // mapY: 107,
            type: 'dragStart'
        });

        expect(results.dragStop).to.have.lengthOf(2);
        expect(results.dragStop[0]).to.deep.include({
            button: 0,
            mapX: 180,
            mapY: 200,
            type: 'dragStop'
        });
        expect(results.dragStop[1]).to.deep.include({
            button: 0,
            mapX: 140,
            mapY: 190,
            type: 'dragStop'
        });
    });


    it('validate dragStart and dragStop by draging map', async function() {
        let listener = new testUtils.Listener(editor, ['dragStart', 'dragStop']);

        // drag map
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 110, y: 110}, {x: 100, y: 200});
        });

        // drag map on click
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 393, y: 478}, {x: 506, y: 389});
        });

        let results = listener.stop();

        expect(results.dragStart).to.have.lengthOf(0);
        expect(results.dragStop).to.have.lengthOf(0);
    });
});
