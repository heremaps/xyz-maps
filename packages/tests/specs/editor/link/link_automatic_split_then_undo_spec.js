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
import dataset from './link_automatic_split_then_undo_spec.json';

describe('drag a link shape point to the other one to split itself and then undo', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    let link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.256321, latitude: 15.31888},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
        link = preparedData.getFeature('linkLayer', -189057);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate 1 link in viewport and no link in viewport is changed', function() {
        expect(editor.info()).to.have.lengthOf(0);

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(1);
    });


    it('select a link to drag', async function() {
        link.select();
        await testUtils.events.drag(mapContainer, {x: 400, y: 200}, {x: 100, y: 100});

        expect(editor.info()).to.have.lengthOf(3);
    });

    it('validate 2 links in viewport', function() {
        let objs = editor.search(display.getViewBounds());

        expect(objs).to.have.lengthOf(2);
    });

    it('undo last drag', async function() {
        editor.undo();

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(1);
    });

    it('revert changes', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(1);
    });
});
