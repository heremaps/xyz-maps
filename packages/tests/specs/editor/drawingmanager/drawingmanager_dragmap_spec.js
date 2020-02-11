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
import dataset from './drawingmanager_dragmap_spec.json';

describe('Create new Links by drawing manager', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;


    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.98506, latitude: 12.88776},
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


    it('start drawing manager', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            editor.getDrawingBoard().start({
                position: {x: 143, y: 95}
            });
        });

        expect(editor.getDrawingBoard().isActive()).to.be.true;
    });


    it('add shape point and validate', async function() {
        await testUtils.events.mousemove(mapContainer, {x: 100, y: 80}, {x: 100, y: 100});
        await testUtils.events.click(mapContainer, 100, 100);

        await testUtils.events.mousemove(mapContainer, {x: 100, y: 280}, {x: 100, y: 300});
        await testUtils.events.click(mapContainer, 100, 300);

        expect(editor.getDrawingBoard().getLength()).to.be.equal(3);

        await testUtils.events.mousemove(mapContainer, {x: 100, y: 180}, {x: 150, y: 200});
        await testUtils.events.click(mapContainer, 150, 200);

        expect(editor.getDrawingBoard().getLength()).to.be.equal(4);
    });

    it('drag ground, validate map is dragged', async function() {
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 200, y: 100}, {x: 250, y: 100});
        });
        expect(display.getCenter().longitude).to.not.equal(76.98506);
    });


    it('finish drawing the link and validate its prop', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            link = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        });

        link.prop('fc', 1);

        expect(link.prop('fc')).to.equal(1);
    });


    it('revert all modifications', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        expect(editor.getDrawingBoard().isActive()).to.be.false;

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(0);
    });
});
