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
import dataset from './drawingmanager_create_and_connect_to_link_head_spec.json';

describe('Create new Links and connect to head of original link', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.001343, latitude: 13.074603},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -188846);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });


    it('start drawing a link connectting to a link head', async function() {
        editor.getDrawingBoard().start({
            position: {x: 304, y: 310},
            connectTo: link
        });

        await testUtils.events.mousemove(mapContainer, {x: 400, y: 190}, {x: 400, y: 200});
        await testUtils.events.click(mapContainer, 400, 200);

        editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
    });


    it('get link and validate it', async function() {
        let createdLink = (await editorTests.click(editor, 400, 200)).target;

        expect(createdLink.coord()).to.deep.equal([
            [77.000806597, 13.074550786, 0],
            [77.001343, 13.075125535, 0]
        ]);

        // validate shape point is connecting to another link
        let shape = (await editorTests.click(editor, 300, 310)).target;
        expect(shape.getConnectedLinks()).to.have.lengthOf(1);
    });

    it('validate links in viewport', function() {
        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(2);
    });
});
