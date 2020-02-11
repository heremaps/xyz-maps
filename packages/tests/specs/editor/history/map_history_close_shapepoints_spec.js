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
import {Editor} from '@here/xyz-maps-editor';
import dataset from './map_history_close_shapepoints_spec.json';

describe('map history for undo, redo changes to shapepoints which are close to each other', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var link2;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {latitude: 18.865855, longitude: 73.07682},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        link2 = preparedData.getFeature('linkLayer', -189000);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate that 2 links are in viewport', function() {
        let objs = editor.search(display.getViewBounds());

        expect(objs).to.have.lengthOf(2);
    });

    it('select link and connect a shapepoint to link, undo and validate', async function() {
        link2.select();
        let mapContainer = display.getContainer();
        await testUtils.events.drag(mapContainer, {x: 280, y: 346}, {x: 270, y: 346});
        await testUtils.events.drag(mapContainer, {x: 215, y: 149}, {x: 150, y: 100});

        editor.undo();

        let objs = editor.search(display.getViewBounds());

        expect(objs).to.have.lengthOf(3);
    });
});
