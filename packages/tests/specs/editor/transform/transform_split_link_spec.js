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
import dataset from './transform_split_link_spec.json';

describe('splitting link deactivates transformer of objects', function() {
    const expect = chai.expect;

    let link2;
    let editor; let display;
    let preparedData;
    let mapContainer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.551603, latitude: 13.848644},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link2 = preparedData.getFeature('linkLayer', -189188);
        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(2);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('activate transformer and connect links and crossing', function() {
        link2.transform();

        let crs = link2.checkCrossings();
        crs[0].connect();

        expect(editor.get('history.current')).to.equal(1);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(6);

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(4);
    });


    xit('validate not able to transform', async function() {
        let obj;
        await editorTests.waitForEditorReady(editor, async ()=>{
            obj = testUtils.events.drag(display, {x: 170, y: 225}, {x: 200, y: 250});
        });

        expect(editor.get('history.current')).to.equal(2);
        expect(editor.get('history.length')).to.equal(2);
        expect(editor.get('changes.length')).to.equal(6);
    });
});
