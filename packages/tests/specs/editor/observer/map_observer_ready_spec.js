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
import dataset from './map_observer_ready_spec.json';

describe('map ready observer', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let mapContainer;
    let preparedData;
    let linkLayer;
    let placeLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.02831, latitude: 12.9356},
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

    it('observe ready', async function() {
        let observer = new testUtils.Observer(editor, 'ready');

        // drag map
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 100, y: 200});
        });

        let p = new features.Navlink([{x: 50, y: 50}, {x: 100, y: 50}], {featureClass: 'NAVLINK'});
        editor.addFeature(p, linkLayer);

        editor.undo();

        editor.redo();

        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        let results = observer.stop();
        expect(results['ready']).to.deep.equal([false, true, false, true]);
    });

    it('start observe again with submitting changes', async function() {
        let observer = new testUtils.Observer(editor, 'ready');

        let l = new features.Navlink([{x: 100, y: 50}, {x: 150, y: 50}], {featureClass: 'NAVLINK'});
        let link = editor.addFeature(l, linkLayer);

        let idMap;

        await editorTests.waitForEditorReady(editor, async ()=>{
            idMap = await editorTests.submit(editor);
        });

        let linkId = idMap.permanentIDMap[link.getProvider().id][link.id];

        let lnk = editor.getFeature(linkId, linkLayer);
        lnk.remove();

        await editorTests.waitForEditorReady(editor, async ()=>{
            await editorTests.submit(editor);
        });

        let results = observer.stop();
        expect(results['ready']).to.deep.equal([false, true, false, true]);
    });

    it('observe again with activate and deactivate the editor', function() {
        let observer = new testUtils.Observer(editor, 'ready');

        editor.active(false);

        editor.active(true);

        let results = observer.stop();
        expect(results['ready']).to.have.lengthOf(0);
    });

    it('observe again with setting zoomlevels', async function() {
        let observer = new testUtils.Observer(editor, 'ready');

        await editorTests.waitForEditorReady(editor, ()=>{
            display.setZoomlevel(16);
        });

        await editorTests.waitForEditorReady(editor, ()=>{
            display.setZoomlevel(10);
        });

        await editorTests.waitForEditorReady(editor, ()=>{
            display.setZoomlevel(7);
        });

        await editorTests.waitForEditorReady(editor, ()=>{
            display.setZoomlevel(4);
        });

        await editorTests.waitForEditorReady(editor, ()=>{
            display.setZoomlevel(2);
        });

        await editorTests.waitForEditorReady(editor, ()=>{
            display.setZoomlevel(18);
        });

        let results = observer.stop();
        expect(results['ready']).to.deep.equal([false, true, false, true, false, true, false, true, false, true, false, true]);
    });
});
