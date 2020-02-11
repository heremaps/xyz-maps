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
import dataset from './link_snap_delete_spec.json';

describe('link shape point snapping to delete link', function() {
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
            center: {longitude: 79.85780289018322, latitude: 11.961515259320095},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');

        link = editor.addFeature(new features.Navlink([{x: 100, y: 100}, {x: 100, y: 200}], {featureClass: 'NAVLINK'}), linkLayer);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate one link in viewport', function() {
        expect(editor.info()).to.have.lengthOf(1);
    });

    it('drag a link shape point to the other shape point', async function() {
        link.select();
        await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 100, y: 203});

        expect(editor.info()).to.have.lengthOf(0);
    });

    it('undo and drag link shape point again to the other shape point with more distance', async function() {
        editor.undo();

        link = editor.getFeature(link.id, linkLayer);
        link.select();
        await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 100, y: 204});

        expect(editor.info()).to.have.lengthOf(1);
    });
});
