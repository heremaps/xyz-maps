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
import dataset from './map_changes_spec.json';


describe('map changes test', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;


    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.089289, latitude: 13.010477},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
    });


    it('add a link object', function() {
        let l = new features.Navlink([{x: 110, y: 110}, {x: 120, y: 210}], {featureClass: 'NAVLINK'});
        let link = editor.addFeature(l);

        expect(editor.get('history.current')).to.equal(1);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(1);
    });

    it('undo changes', function() {
        editor.undo();

        expect(editor.get('history.current')).to.equal(0);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(0);
    });

    it('undo changes once again', function() {
        editor.undo();

        expect(editor.get('history.current')).to.equal(0);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(0);
    });

    it('undo one more time', function() {
        editor.undo();

        expect(editor.get('history.current')).to.equal(0);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(0);
    });


    it('redo change', function() {
        editor.redo();

        expect(editor.get('history.current')).to.equal(1);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(1);
    });

    it('redo change again', function() {
        editor.redo();

        expect(editor.get('history.current')).to.equal(1);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(1);
    });


    it('revert change', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        expect(editor.info()).to.have.lengthOf(0);
        expect(editor.get('history.current')).to.equal(0);
        expect(editor.get('history.length')).to.equal(0);
        expect(editor.get('changes.length')).to.equal(0);
    });


    it('revert change again', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        expect(editor.info()).to.have.lengthOf(0);
        expect(editor.get('history.current')).to.equal(0);
        expect(editor.get('history.length')).to.equal(0);
        expect(editor.get('changes.length')).to.equal(0);
    });
});
