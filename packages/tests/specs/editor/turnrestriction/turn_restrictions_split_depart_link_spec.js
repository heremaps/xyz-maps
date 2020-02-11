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
import dataset from './turn_restrictions_split_depart_link_spec.json';

describe('turn restriction test split the depart link', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    let link1; let link2;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.896023, latitude: 12.99956},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -189223);
        link2 = preparedData.getFeature('linkLayer', -189224);

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(2);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('set turn restriction and validate', async function() {
        await testUtils.events.click(mapContainer, 200, 100);

        let shape = (await editorTests.click(editor, 200, 200)).target;
        shape.editTurnRestrictions();

        // click on traffic sign
        await testUtils.events.click(mapContainer, 215, 200);

        expect(link2.prop('turnRestriction')).to.deep.equal({end: [link1.id]});
    });

    it('split the link, verify links after splitting', async function() {
        link2.select();
        let shape = (await editorTests.click(editor, 200, 100)).target;
        let newLinks = shape.splitLink();

        expect(newLinks[0].prop('originLink')).to.be.equal(link2.id);
        expect(newLinks[1].prop('originLink')).to.be.equal(link2.id);
    });
});
