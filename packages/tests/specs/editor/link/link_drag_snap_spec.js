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
import {Editor} from '@here/xyz-maps-editor';
import dataset from './link_drag_snap_spec.json';

describe('link shape point drag to snapping to other links', function() {
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
            center: {latitude: 16.324926, longitude: 75.290762},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link2 = preparedData.getFeature('linkLayer', -189063);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('select the second link, drag the shape point to connect to link', async function() {
        link2.select();

        await testUtils.events.drag(mapContainer, {x: 150, y: 150}, {x: 294, y: 100});

        expect(link2.coord()).to.deep.equal([
            [75.290493779, 16.325440813, 0], [75.289957337, 16.32531211, 0]
        ]);
    });

    it('select the second link again and drag the shape point to connect to the other shape point of the link', async function() {
        editor.undo();
        let lnk = editor.getFeature(link2.id, linkLayer);
        lnk.select();

        await testUtils.events.drag(mapContainer, {x: 150, y: 150}, {x: 294, y: 200});

        expect(lnk.coord()).to.deep.equal([
            [75.290493779, 16.325183407, 0], [75.289957337, 16.32531211, 0]
        ]);
    });
});
