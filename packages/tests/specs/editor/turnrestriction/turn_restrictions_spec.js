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
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './turn_restrictions_spec.json';

describe('turn restriction test basic', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    var link1; var link2;
    var linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.735086, latitude: 12.894254},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');

        link1 = preparedData.getFeature('linkLayer', -189221);
        link2 = preparedData.getFeature('linkLayer', -189222);
        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(2);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('edit turn restriction, validate its value', async function() {
        let link = (await editorTests.click(editor, 320, 100)).target;

        link.editTurnRestrictions();

        await testUtils.events.click(mapContainer, 300, 115);

        expect(link.prop('turnRestriction')).to.deep.equal({start: [link2.id]});
    });


    it('submit, validate link has correct value', async function() {
        let idMap;

        await editorTests.waitForEditorReady(editor, async ()=>{
            idMap = await editorTests.submit(editor);
        });

        let lnk1 = editor.getFeature(link1.id, linkLayer);
        let lnk2 = editor.getFeature(link2.id, linkLayer);

        expect(link1.prop('turnRestriction')).to.deep.equal({start: [link2.id]});
    });

    it('edit turn restriction again and revert, after that move mouse and submit', async function() {
        await testUtils.events.click(mapContainer, 320, 100);
        let shape = (await editorTests.click(editor, 300, 115)).target;
        shape.editTurnRestrictions();
        await testUtils.events.click(mapContainer, 300, 115);

        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        await testUtils.events.mousemove(mapContainer, {x: 310, y: 100}, {x: 310, y: 120}); // exception was thrown if mouse was moved after editting turn restriction

        expect(editor.info()).to.lengthOf(0); // nothing is expected to be submitted
        editor.submit();
    });
});
