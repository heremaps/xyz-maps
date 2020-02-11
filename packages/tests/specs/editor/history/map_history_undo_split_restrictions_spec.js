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
import dataset from './map_history_undo_split_restrictions_spec.json';

describe('turn restriction with spliting the depart link and undo', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    let link1;
    let link2;
    let splitLinks;
    let linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.868793, latitude: 13.30644},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -189014);
        link2 = preparedData.getFeature('linkLayer', -189015);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('click on connection point to edit turn restrictions', async function() {
        link2.editTurnRestrictions();

        await testUtils.events.click(mapContainer, 390, 400);

        expect(link2.prop('turnRestriction')).to.deep.equal({start: [link1.id]});
    });

    it('get the shapepoint to split the link, validate link is splitted correctly', async function() {
        link2.select();
        let linkshape = (await editorTests.click(editor, 450, 400)).target;

        splitLinks = linkshape.splitLink();

        expect(splitLinks[0].prop('originLink')).to.be.equal(link2.id);
        expect(splitLinks[1].prop('originLink')).to.be.equal(link2.id);
        expect(splitLinks[0].prop('parentLink')).to.be.equal(link2.id);
        expect(splitLinks[1].prop('parentLink')).to.be.equal(link2.id);
    });

    it('undo last split, validate link turn restriction value', async function() {
        editor.undo();

        let lnk1 = editor.getFeature(link1.id, linkLayer);
        let lnk2 = editor.getFeature(link2.id, linkLayer);

        expect(lnk2.prop('turnRestriction')).to.deep.equal({start: [lnk1.id]});
    });

    it('redo last split, verify splitted link', async function() {
        editor.redo();

        let splnk1 = editor.getFeature(splitLinks[0].id, linkLayer);
        let splnk2 = editor.getFeature(splitLinks[1].id, linkLayer);

        expect(splnk1.prop('originLink')).to.be.equal(link2.id);
        expect(splnk2.prop('originLink')).to.be.equal(link2.id);
        expect(splnk1.prop('parentLink')).to.be.equal(link2.id);
        expect(splnk2.prop('parentLink')).to.be.equal(link2.id);
    });
});
