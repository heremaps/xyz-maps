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
import dataset from './turn_restrictions_disconnect_spec.json';

describe('edit turn restriction disconnect link, link is marked as disconnected', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    let link1; let link2; let link3; let link4;
    let linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.942132, latitude: 13.329791},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');

        link1 = preparedData.getFeature('linkLayer', -189189);
        link2 = preparedData.getFeature('linkLayer', -189190);
        link3 = preparedData.getFeature('linkLayer', -189191);
        link4 = preparedData.getFeature('linkLayer', -189192);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('set turn restriction and validate turn restriction value', async function() {
        link1.editTurnRestrictions();

        // set turn restriction
        await testUtils.events.click(mapContainer, 200, 115);

        expect(link1.prop('turnRestriction')).to.deep.equal({end: [link2.id]});
    });

    it('deactivate turn restriction editor and disconnect shape point, validate disconnected link', async function() {
        await testUtils.events.click(mapContainer, 100, 300);

        link1.select();

        let shape = (await editorTests.click(editor, 200, 100)).target;
        shape.disconnect();

        expect(link1.prop('disconnected')).to.be.equal('HOOK');
        expect(link1.prop('estate')).to.be.equal('UPDATED');
    });


    it('undo the disconnection and validate turn restriction value', function() {
        editor.undo();

        link1 = editor.getFeature(link1.id, linkLayer);
        link2 = editor.getFeature(link2.id, linkLayer);
        expect(link1.prop('turnRestriction')).to.deep.equal({end: [link2.id]});
    });


    it('disconnect and validate disconnected attribute again', async function() {
        link2.select();
        let shape = (await editorTests.click(editor, 200, 100)).target;

        shape.disconnect();

        expect(link2.prop('disconnected')).to.be.equal('HOOK');
        expect(link2.prop('estate')).to.be.equal('UPDATED');
    });


    it('undo the disconnect and set turn restriction with other two links, validate the turn restriction value', async function() {
        editor.undo();

        link1 = editor.getFeature(link1.id, linkLayer);
        link2 = editor.getFeature(link2.id, linkLayer);
        link3 = editor.getFeature(link3.id, linkLayer);
        link4 = editor.getFeature(link4.id, linkLayer);

        link4.editTurnRestrictions();

        // set turn restriction
        await testUtils.events.click(mapContainer, 290, 200);
        // click to deactivate turn restriction
        await testUtils.events.click(mapContainer, 100, 200);


        link3.editTurnRestrictions();

        // set turn restriction
        await testUtils.events.click(mapContainer, 290, 200);
        // click to deactivate turn restriction
        await testUtils.events.click(mapContainer, 100, 200);

        expect(link1.prop('turnRestriction')).to.deep.equal({end: [link2.id]});
        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link2.id]});
        expect(link4.prop('turnRestriction')).to.deep.equal({end: [link2.id]});
    });

    it('disconnect shape pont and validate again', async function() {
        link3.select();

        // get link shape point to disconnect
        let shape = (await editorTests.click(editor, 300, 200)).target;
        shape.disconnect();

        expect(link3.prop('disconnected')).to.be.equal('HOOK');
        expect(link3.prop('estate')).to.be.equal('UPDATED');
    });

    it('undo the disconnect and disconnect again', async function() {
        editor.undo();

        link2 = editor.getFeature(link2.id, linkLayer);
        link2.select();

        // get link shape point to disconnect
        let shape = (await editorTests.click(editor, 300, 200)).target;
        shape.disconnect();

        link1 = editor.getFeature(link1.id, linkLayer);
        link2 = editor.getFeature(link2.id, linkLayer);

        expect(link2.prop('disconnected')).to.be.equal('HOOK');
        expect(link2.prop('estate')).to.be.equal('UPDATED');
    });
});
