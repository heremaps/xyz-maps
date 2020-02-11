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
import chaiAlmost from 'chai-almost';
import dataset from './map_events_listeners_spec.json';

describe('map event system', function() {
    const expect = chai.expect;
    let link; let address; let poi; let area;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 8.573258087408306, latitude: 50.03670252050714},
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

    it('validate pointup, dragStart and dragStop events on link', async function() {
        let listener = new testUtils.Listener(editor, ['pointerup', 'dragStart', 'dragStop']);

        // click on link
        link = (await editorTests.click(editor, 120, 101)).target;

        // drag middle shape point of link
        await testUtils.events.drag(mapContainer, {x: 200, y: 75}, {x: 150, y: 75});

        let results = listener.stop();
        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 120,
            mapY: 101,
            type: 'pointerup'
        });
        expect(results.dragStart).to.have.lengthOf(1);
        expect(results.dragStart[0]).to.deep.include({
            button: 0,
            mapY: 75,
            type: 'dragStart'
        });
        expect(results.dragStop).to.have.lengthOf(1);
        expect(results.dragStop[0]).to.deep.include({
            button: 0,
            mapX: 150,
            mapY: 75,
            type: 'dragStop'
        });

        expect(link.coord()).to.deep.almost([
            [8.571648762, 50.037391625, 0],
            [8.572185204, 50.037391625, 0],
            [8.571863339, 50.037477763, 0],
            [8.572185204, 50.0375639, 0]
        ]);
    });

    it('validate pointup, dragStart and dragStop events on address', async function() {
        let listener = new testUtils.Listener(editor, ['pointerup', 'dragStart', 'dragStop']);

        // click on address
        address = (await editorTests.click(editor, 100, 150)).target;

        // drag navigation position of address
        await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 150, y: 100});

        // drag address object
        await testUtils.events.drag(mapContainer, {x: 100, y: 150}, {x: 50, y: 150});

        let results = listener.stop();

        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 100,
            mapY: 150,
            type: 'pointerup'
        });
        expect(results.dragStart).to.have.lengthOf(2);
        expect(results.dragStart[0]).to.deep.include({
            button: 0,
            mapY: 100,
            type: 'dragStart'
        });
        expect(results.dragStart[1]).to.deep.include({
            button: 0,
            mapY: 150,
            type: 'dragStart'
        });
        expect(results.dragStop).to.have.lengthOf(2);
        expect(results.dragStop[0]).to.deep.include({
            button: 0,
            mapX: 150,
            mapY: 100,
            type: 'dragStop'
        });
        expect(results.dragStop[1]).to.deep.include({
            button: 0,
            mapX: 50,
            mapY: 150,
            type: 'dragStop'
        });

        expect(address.coord()).to.deep.equal([8.571380542, 50.03721935, 0]);
    });


    it('validate pointup, dragStart and dragStop events on place', async function() {
        let listener = new testUtils.Listener(editor, ['pointerup', 'dragStart', 'dragStop']);


        // click on place
        poi = (await editorTests.click(editor, 150, 150)).target;

        // drag place
        await testUtils.events.drag(mapContainer, {x: 150, y: 150}, {x: 120, y: 150});

        let results = listener.stop();

        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 150,
            mapY: 150,
            type: 'pointerup'
        });
        expect(results.dragStart).to.have.lengthOf(1);
        expect(results.dragStart[0]).to.deep.include({
            button: 0,
            mapY: 150,
            type: 'dragStart'
        });
        expect(results.dragStop).to.have.lengthOf(1);
        expect(results.dragStop[0]).to.deep.include({
            button: 0,
            mapX: 120,
            mapY: 150,
            type: 'dragStop'
        });

        expect(poi.coord()).to.deep.equal([8.571756051, 50.03721935, 0]);
    });


    it('validate pointup, dragStart and dragStop events on area', async function() {
        let listener = new testUtils.Listener(editor, ['pointerup', 'dragStart', 'dragStop']);

        // click on area
        area = (await editorTests.click(editor, 150, 190)).target;

        // drag area middle point
        await testUtils.events.drag(mapContainer, {x: 150, y: 200}, {x: 150, y: 220});

        let results = listener.stop();

        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 150,
            mapY: 190,
            type: 'pointerup'
        });
        expect(results.dragStart).to.have.lengthOf(1);
        expect(results.dragStart[0]).to.deep.include({
            button: 0,
            type: 'dragStart'
        });
        expect(results.dragStop).to.have.lengthOf(1);
        expect(results.dragStop[0]).to.deep.include({
            button: 0,
            mapX: 150,
            mapY: 220,
            type: 'dragStop'
        });

        expect(area.coord()).to.deep.almost([[[
            [8.571916983, 50.037115985, 0],
            [8.572185204, 50.037047074, 0],
            [8.571916983, 50.036978164],
            [8.571648762, 50.037047074, 0],
            [8.571916983, 50.037115985, 0]
        ]]]);
    });

    it('validate pointup, dragStart and dragStop events on the ground', async function() {
        let listener = new testUtils.Listener(editor, ['pointerup', 'dragStart', 'dragStop']);

        // drag area shape point
        await testUtils.events.drag(mapContainer, {x: 100, y: 200}, {x: 80, y: 200});

        // click on map
        await testUtils.events.click(mapContainer, 450, 50);

        // drag the ground
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 80, y: 80}, {x: 60, y: 80});
        });

        // drag the ground under link
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 120, y: 100});
        });

        // drag the ground under area
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 150, y: 190}, {x: 180, y: 190});
        });

        let results = listener.stop();

        expect(results.dragStart).to.have.lengthOf(1);
        expect(results.dragStop).to.have.lengthOf(1);
    });
});
