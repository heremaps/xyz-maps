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
import dataset from './drawingmanager_connect_link_spec.json';

describe('Create new Links and drag connect point,original link is not split', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.26345, latitude: 13.24889},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);

        link = preparedData.getFeature('linkLayer', -188845);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('draw link with connectTo link,drag the connect point, and check 2 links are in viewport', async function() {
        let mapContainer = display.getContainer();

        editor.getDrawingBoard().start({
            mode: features.Navlink,
            position: {x: 143, y: 95},
            connectTo: link
        });

        await testUtils.events.mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 200});
        await testUtils.events.click(mapContainer, 200, 200);

        await testUtils.events.mousemove(mapContainer, {x: 200, y: 200}, {x: 200, y: 300});
        await testUtils.events.click(mapContainer, 200, 300);

        // drag the connectting point
        await testUtils.events.drag(mapContainer, {x: 143, y: 95}, {x: 50, y: 100});

        await editorTests.waitForEditorReady(editor, ()=>{
            editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        });

        // connectTo link is not split
        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(2);
    });

    it('create link again, nothing happens', async function() {
        editor.getDrawingBoard().create();
    });
});
