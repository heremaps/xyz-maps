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
import dataset from './map_history_multiple_steps_spec.json';

describe('map history for multiple steps redo and undo', function() {
    const expect = chai.expect;

    var editor;
    var display;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {latitude: 18.865855, longitude: 73.07682},
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

    it('add objects and validate', function() {
        var lnk = new features.Navlink([{x: 100, y: 150}, {x: 300, y: 150}], {featureClass: 'NAVLINK'});


        var poi1 = new features.Place({x: 100, y: 200}, {featureClass: 'PLACE'});


        var poi2 = new features.Place({x: 200, y: 200}, {featureClass: 'PLACE'});


        var poi3 = new features.Place({x: 250, y: 200}, {featureClass: 'PLACE'});


        var poi4 = new features.Place({x: 250, y: 250}, {featureClass: 'PLACE'});

        editor.addFeature(lnk);
        editor.addFeature(poi1);
        editor.addFeature(poi2);
        editor.addFeature(poi3);
        editor.addFeature(poi4);

        expect(editor.get('history.current')).to.equal(5);
        expect(editor.get('history.length')).to.equal(5);
        expect(editor.get('changes.length')).to.equal(5);
    });


    it('undo again and validate', function() {
        editor.undo(2);

        expect(editor.get('history.current')).to.equal(3);
        expect(editor.get('history.length')).to.equal(5);
        expect(editor.get('changes.length')).to.equal(3);
    });

    it('undo and validate', function() {
        editor.undo();

        expect(editor.get('history.current')).to.equal(2);
        expect(editor.get('history.length')).to.equal(5);
        expect(editor.get('changes.length')).to.equal(2);
    });

    it('redo and validate', function() {
        editor.redo(2);

        expect(editor.get('history.current')).to.equal(4);
        expect(editor.get('history.length')).to.equal(5);
        expect(editor.get('changes.length')).to.equal(4);
    });

    it('redo again and validate', function() {
        editor.redo(3);

        expect(editor.get('history.current')).to.equal(4);
        expect(editor.get('history.length')).to.equal(5);
        expect(editor.get('changes.length')).to.equal(4);
    });


    it('revert changes then redo and validate', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        editor.redo();

        expect(editor.get('history.current')).to.equal(0);
        expect(editor.get('history.length')).to.equal(0);
        expect(editor.get('changes.length')).to.equal(0);
    });
});
