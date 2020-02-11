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
import dataset from './map_observer_changes_spec.json';
import {Map} from '@here/xyz-maps-core';
import {features, Editor} from '@here/xyz-maps-editor';

describe('map changes observers', function() {
    const expect = chai.expect;

    var preparedData;
    var editor;
    var display;
    var idMaps = [];

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.99846774250119, latitude: 12.959476417718449},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
    });

    after(async function() {
        await editorTests.clean(editor, idMaps);
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('observe changes history with undo, redo', async function() {
        let observer = new testUtils.Observer(editor, 'history.current');

        let addr1 = new features.Address({x: 200, y: 300}, {featureClass: 'ADDRESS'});
        let lnk = new features.Navlink([{x: 100, y: 200}, {x: 200, y: 300}], {featureClass: 'NAVLINK'});

        editor.addFeature(lnk);
        editor.addFeature(addr1);

        editor.undo();
        editor.redo();

        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        let results = observer.stop();
        expect(results['history.current']).to.deep.equal([1, 2, 1, 2, 0]);
    });

    it('observe changes history with undo, revert and submit', async function() {
        let observer = new testUtils.Observer(editor, 'history.current');

        let addr1 = new features.Address({x: 200, y: 300}, {featureClass: 'ADDRESS'});
        editor.addFeature(addr1);

        editor.undo();

        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        let addr2 = new features.Address({x: 300, y: 300}, {featureClass: 'ADDRESS'});
        editor.addFeature(addr2);
        let idMap;
        await editorTests.waitForEditorReady(editor, async ()=>{
            idMap = await editorTests.submit(editor);
            idMaps.push(idMap);
        });

        let results = observer.stop();
        expect(results['history.current']).to.deep.equal([1, 0, 0, 1, 0]);
    });
});
