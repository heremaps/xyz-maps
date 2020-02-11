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
import dataset from './link_modify_address_changed_spec.json';

describe('link modify, address changed automatically', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;
    let linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 79.60576, latitude: 11.973837},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -189075);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('select a link and drag', async function() {
        link.select();

        await testUtils.events.drag(mapContainer, {x: 300, y: 226}, {x: 300, y: 300});

        expect(editor.info()).to.have.lengthOf(4);
    });

    it('undo the drag, select and drag it again', async function() {
        editor.undo();

        let lnk = editor.getFeature(link.id, linkLayer);
        lnk.select();

        await testUtils.events.drag(mapContainer, {x: 300, y: 226}, {x: 398, y: 240});

        expect(editor.info()).to.have.lengthOf(4);
    });
});
