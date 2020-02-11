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
import dataset from './turn_restrictions_outofview_spec.json';

describe('turn restriction test move link outside of viewport', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link1; let link2;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.73514, latitude: 12.89769},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -189213);
        link2 = preparedData.getFeature('linkLayer', -189214);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('edit turn restriction and validate it is set', async function() {
        await testUtils.events.click(mapContainer, 150, 100);

        let shape = (await editorTests.click(editor, 300, 100)).target;

        shape.editTurnRestrictions();

        await testUtils.events.click(mapContainer, 310, 100);

        expect(link1.prop('turnRestriction')).to.deep.equal({end: [link2.id]});
    });


    it('drag map to move link outside of viewport and move back into viewport, validate its value', async function() {
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 50, y: 210}, {x: 650, y: 210});
        });

        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 650, y: 210}, {x: 50, y: 210});
        });

        expect(link1.prop('turnRestriction')).to.deep.equal({end: [link2.id]});
    });
});
