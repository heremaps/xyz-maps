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
import dataset from './link_split_hide_turn_restrictions_spec.json';

describe('link splitting hides the turn restrictions edit', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link1; let link2; let link3;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.775492, latitude: 13.344394},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -189091);
        link2 = preparedData.getFeature('linkLayer', -189092);
        link3 = preparedData.getFeature('linkLayer', -189093);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('get a link to edit turn restrictions', async function() {
        link3.select();
        link3.editTurnRestrictions();

        await testUtils.events.click(mapContainer, 110, 100);

        expect(link3.prop('turnRestriction')).to.deep.equal({start: [link2.id]});
    });

    it('validate objects in viewport', function() {
        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(3);
    });

    it('drag middle point to split the link, validate turn restrictions is deactivated, link is clicked', async function() {
        await testUtils.events.drag(mapContainer, {x: 100, y: 150}, {x: 100, y: 300});

        // link is clicked, not turn restriction editor
        let link = (await editorTests.click(editor, 110, 100)).target;

        expect(link.geometry.coordinates).to.deep.equal([
            [77.773883099, 13.345438764, 0],
            [77.774419541, 13.345438764, 0],
            [77.774419541, 13.344393992, 0]
        ]);
    });
});
