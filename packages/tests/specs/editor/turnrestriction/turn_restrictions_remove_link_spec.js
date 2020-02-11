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
import dataset from './turn_restrictions_remove_link_spec.json';

describe('edit turn restriction by function on link then remove the link', function() {
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
            center: {longitude: 76.80573149474153, latitude: 13.1453125009397},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');

        link1 = preparedData.getFeature('linkLayer', -189211);
        link2 = preparedData.getFeature('linkLayer', -189212);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('set turn restriction and validate turn restriction value', async function() {
        link2.editTurnRestrictions();

        await testUtils.events.click(mapContainer, 185, 100);

        // deactivate turn restriction
        await testUtils.events.click(mapContainer, 100, 200);
        expect(link2.prop('turnRestriction')).to.deep.equal({start: [link1.id]});
    });

    it('remove link and validate', function() {
        link1.remove();

        let info = editor.info();
        expect(info[1].properties['removed']).to.be.equal('HOOK');
        expect(info[1].properties['estate']).to.be.equal('REMOVED');
    });
});
