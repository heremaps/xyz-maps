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
import {features, Editor} from '@here/xyz-maps-editor';
import {Map} from '@here/xyz-maps-core';
import dataset from './address_create_when_link_inactive_spec.json';

describe('add Address object when link is deactivated', function() {
    const expect = chai.expect;

    var preparedData;
    var editor;
    var display;

    before(async function() {
        preparedData = await prepare(dataset);

        display = new Map(document.getElementById('map'), {
            center: {longitude: 79.436809, latitude: 16.538429},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await editorTests.waitForEditorReady(editor);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate objs in viewport', function() {
        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(4);
    });

    it('set zoomlevel to 19 and validate objs in viewport again', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setZoomlevel(19);
        });

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(2);
    });

    it('add an address and validate objs in viewport ', function() {
        let addr = new features.Address({x: 200, y: 300}, {featureClass: 'ADDRESS'});
        let address = editor.addFeature(addr);

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(3);
    });

    it('revert changes set zoomlevel back and validate objs in viewport again', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        await editorTests.waitForEditorReady(editor, ()=>{
            display.setZoomlevel(18);
        });

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(4);
    });
});
