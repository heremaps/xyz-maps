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
 */import {editorTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './link_automatic_snapping_then_undo_spec.json';

describe('drag a link shape point to the other one and then undo', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link2;
    let linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.229901, latitude: 15.187356},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link2 = preparedData.getFeature('linkLayer', -189027);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('get a link to select and drag', async function() {
        link2.select();
        await testUtils.events.drag(mapContainer, {x: 462, y: 389}, {x: 275, y: 228});

        expect(editor.info()).to.have.lengthOf(2);

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(1);
    });

    it('undo last drag and validate', async function() {
        editor.undo();

        expect(editor.info()).to.have.lengthOf(0);

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(2);

        link2 = editor.getFeature(link2.id, linkLayer);
        let coord = link2.coord();
        expect(coord).to.deep.equal([
            [76.22923083, 15.187728775, 0],
            [76.230233976, 15.186895307, 0]
        ]);
    });
});
