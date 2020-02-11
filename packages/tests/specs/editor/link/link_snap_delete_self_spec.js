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
import dataset from './link_snap_delete_self_spec.json';

describe('link shape point snapping to delete link itself', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 8.322249883397774, latitude: 52.51320798105459},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        link = preparedData.getFeature('linkLayer', -189090);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('there is one link in viewport', function() {
        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(1);
    });


    it('drag the link shape point to connect one point to the other, validate the link is removed', async function() {
        link.select();
        let mapContainer = display.getContainer();
        await testUtils.events.drag(mapContainer, {x: 200, y: 200}, {x: 295, y: 200});

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(0);
    });
});
