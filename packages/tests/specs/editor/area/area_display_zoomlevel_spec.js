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
import dataset from './area_display_zoomlevel_spec.json';

describe('Area object display and hide', function() {
    const expect = chai.expect;

    var editor;
    var display;
    let preparedData;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: -95.341612, latitude: 40.330651},
            // center: {longitude: -95.510586, latitude: 40.333169},
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

        await preparedData.clear();
    });

    it('validate the object in viewport', function() {
        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(2);
    });


    it('move map and validate the object again in viewport', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: -95.34138669444274, latitude: 40.32966953325723});
        });

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(1);
    });


    it('zoom out and validate area is not clicked', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setZoomlevel(17);
        });

        let obj = (await editorTests.click(editor, 241, 222)).target;

        expect(obj).to.equal(undefined);
    });


    it('zoom in again to display area and validate area is clicked', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setZoomlevel(18);
        });

        let obj = (await editorTests.click(editor, 242, 146)).target;

        expect(obj.properties).to.deep.include({
            type: 'building',
            name: 'test'
        });
    });
});
