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
import {editorTests, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './map_history_create_objects_undo_submit_spec.json';

describe('map history create objects and undo last changes, should create just one object', function() {
    const expect = chai.expect;

    var editor;
    var display;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.437315, latitude: 18.811783},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
    });

    after(async function() {
        let objs = editor.search(display.getViewBounds());
        objs.forEach((f)=>{
            f.remove();
        });
        await editorTests.waitForEditorReady(editor, ()=>{
            editor.submit();
        });

        editor.destroy();
        display.destroy();
    });

    it('add a link object', function() {
        let l = new features.Navlink([{x: 300, y: 100}, {x: 300, y: 200}], {featureClass: 'NAVLINK'});
        let link = editor.addFeature(l);

        expect(editor.info()).to.have.lengthOf(1);
        expect(editor.get('history.current')).to.equal(1);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(1);
    });

    it('revert objects and add link objects', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        let l1 = new features.Navlink([{x: 200, y: 100}, {x: 100, y: 100}], {featureClass: 'NAVLINK'});
        let l2 = new features.Navlink([{x: 300, y: 200}, {x: 200, y: 250}], {featureClass: 'NAVLINK'});
        editor.addFeature(l1);
        editor.addFeature(l2);

        let objs = editor.search(display.getViewBounds());

        expect(objs).to.have.lengthOf(2);
        expect(editor.info()).to.have.lengthOf(2);
        expect(editor.get('history.current')).to.equal(2);
        expect(editor.get('history.length')).to.equal(2);
        expect(editor.get('changes.length')).to.equal(2);
    });

    it('undo once and validate', function() {
        editor.undo();

        let objs = editor.search(display.getViewBounds());

        expect(objs).to.have.lengthOf(1);
        expect(editor.info()).to.have.lengthOf(1);
        expect(editor.get('history.current')).to.equal(1);
        expect(editor.get('history.length')).to.equal(2);
        expect(editor.get('changes.length')).to.equal(1);
    });


    it('submit and validate only one link is in viewport', async function() {
        await editorTests.waitForEditorReady(editor, async ()=>{
            await editorTests.submit(editor);
        });

        let objs = editor.search(display.getViewBounds());

        expect(objs).to.have.lengthOf(1);
        expect(editor.info()).to.have.lengthOf(0);
        expect(editor.get('history.current')).to.equal(0);
        expect(editor.get('history.length')).to.equal(0);
        expect(editor.get('changes.length')).to.equal(0);
    });
});
