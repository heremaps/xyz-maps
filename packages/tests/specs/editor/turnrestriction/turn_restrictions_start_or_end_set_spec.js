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
import dataset from './turn_restrictions_start_or_end_set_spec.json';

describe('turn restriction either start or end is set', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link1;
    let link2;
    let link3;
    let link4;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.15267063201952, latitude: 13.550232964474148},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -189215);
        link2 = preparedData.getFeature('linkLayer', -189216);
        link3 = preparedData.getFeature('linkLayer', -189217);
        link4 = preparedData.getFeature('linkLayer', -189218);

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(4);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('set turn restriction value and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id]});
        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id]});

        link3.editTurnRestrictions();
        await testUtils.events.click(mapContainer, 415, 200);

        expect(link3.prop('turnRestriction')).to.deep.equal({end: []});
    });

    it('set turn restriction and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id]});
        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id]});

        link3.editTurnRestrictions();
        await testUtils.events.click(mapContainer, 415, 100);
        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id], start: [link2.id]});
    });

    it('set end and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id]});
        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id]});

        link3.editTurnRestrictions();
        await testUtils.events.click(mapContainer, 385, 100);
        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id], start: [link1.id]});
    });

    it('set both start and end and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id], start: [link1.id]});
        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id], start: [link1.id]});

        link3.editTurnRestrictions();
        await testUtils.events.click(mapContainer, 385, 100);

        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id], start: []});
    });


    it('set both start and end and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id], start: [link1.id]});
        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id], start: [link1.id]});

        link3.editTurnRestrictions();
        await testUtils.events.click(mapContainer, 415, 200);

        expect(link3.prop('turnRestriction')).to.deep.equal({end: [], start: [link1.id]});
    });


    it('set both start and end and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id], start: [link1.id]});
        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id], start: [link1.id]});

        link3.editTurnRestrictions();
        await testUtils.events.click(mapContainer, 415, 100);

        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id], start: [link1.id, link2.id]});
    });

    it('set end and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id]});
        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id]});

        link3.editTurnRestrictions();
        await testUtils.events.click(mapContainer, 385, 100);

        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id], start: [link1.id]});
    });


    it('set end and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id]});
        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id]});

        link3.editTurnRestrictions();
        await testUtils.events.click(mapContainer, 415, 200);

        expect(link3.prop('turnRestriction')).to.deep.equal({end: []});
    });


    it('set end and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id]});
        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id]});

        link3.editTurnRestrictions();
        await testUtils.events.click(mapContainer, 415, 100);

        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link4.id], start: [link2.id]});
    });
});
