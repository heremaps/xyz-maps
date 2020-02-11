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
import dataset from './drawingmanager_spec.json';

describe('Create new Links then remove by drawingmanager', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;
    let linkLayer;

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
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('start drawingmanager', function() {
        editor.getDrawingBoard().start();

        expect(editor.getDrawingBoard().isActive()).to.be.true;
    });

    it('cancel drawingmanager', function() {
        editor.getDrawingBoard().cancel();

        expect(editor.getDrawingBoard().isActive()).to.be.false;
    });

    it('start drawingmanager again', async function() {
        editor.getDrawingBoard().start();

        expect(editor.getDrawingBoard().isActive()).to.be.true;

        await testUtils.events.mousemove(mapContainer, {x: 150, y: 200}, {x: 200, y: 200});
        await testUtils.events.click(mapContainer, 200, 200);

        await testUtils.events.mousemove(mapContainer, {x: 150, y: 200}, {x: 150, y: 130});
        await testUtils.events.click(mapContainer, 150, 130);

        await editorTests.waitForEditorReady(editor, ()=>{
            link = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        });

        expect(link.coord()).to.deep.equal([
            [76.983987116, 12.888282928, 0],
            [76.983718895, 12.888648976, 0]
        ]);
    });


    it('submit the new link', async function() {
        let monitor = new testUtils.MonitorXHR();
        let idMap;

        await editorTests.waitForEditorReady(editor, async ()=>{
            idMap = await editorTests.submit(editor);
        });
        let linkId = idMap.permanentIDMap[link.getProvider().id][link.id];
        let reqs = monitor.stop({method: 'post'});
        expect(reqs).to.have.lengthOf(1);
        let payload = reqs[0].payload;

        link = editor.getFeature(linkId, linkLayer);

        expect(payload.features[0].geometry.coordinates).to.deep.equal([
            [76.983987116, 12.888282928, 0],
            [76.983718895, 12.888648976, 0]
        ]);
        expect(payload.features[0].properties).to.deep.include({
            'featureClass': 'NAVLINK'
        });
    });

    it('validate link after submission', async function() {
        expect(link.coord()).to.deep.equal([
            [76.983987116, 12.888282928, 0],
            [76.983718895, 12.888648976, 0]
        ]);
    });


    it('remove created link', async function() {
        link.remove();

        await editorTests.waitForEditorReady(editor, async ()=>{
            await editorTests.submit(editor);
        });

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(0);
    });
});
