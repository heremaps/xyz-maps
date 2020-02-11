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
import dataset from './turn_restrictions_validate_spec.json';

describe('turn restriction validate', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    var link1; var link3;
    let linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: -105.426506, latitude: 35.290071},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');

        link1 = preparedData.getFeature('linkLayer', '-189234');
        link3 = preparedData.getFeature('linkLayer', '-189236');

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(3);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('modify turn restriction and validate its value', async function() {
        await testUtils.events.click(mapContainer, 100, 115);

        link3.editTurnRestrictions();

        await testUtils.events.click(mapContainer, 212, 152);

        await testUtils.events.mousemove(mapContainer, {x: 200, y: 100}, {x: 210, y: 110});

        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link1.id]});
    });
});
