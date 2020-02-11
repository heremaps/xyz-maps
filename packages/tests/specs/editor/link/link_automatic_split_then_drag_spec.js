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
import chaiAlmost from 'chai-almost';
import dataset from './link_automatic_split_then_drag_spec.json';

describe('drag a link shape point to the other one to split itself and then drag it crossing', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link2;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.31624, latitude: 15.841013},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link2 = preparedData.getFeature('linkLayer', -189040);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate 2 link in viewport and no link in viewport is changed', function() {
        expect(editor.info()).to.have.lengthOf(0);

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(2);
    });

    it('select a link to drag', async function() {
        link2.select();

        // drag a link middle point to another link and split the other one.
        await testUtils.events.drag(mapContainer, {x: 300, y: 300}, {x: 250, y: 100});

        expect(editor.info()).to.have.lengthOf(6);

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(4);
    });

    it('click to select the split link and drag', async function() {
        // click a link
        await testUtils.events.click(mapContainer, 290, 100);

        // drag link shape point to which all other links are connecting
        await testUtils.events.drag(mapContainer, {x: 250, y: 100}, {x: 500, y: 200});

        // click to get dragged link
        let link1 = (await editorTests.click(editor, 200, 125)).target;
        let coords1 = link1.coord();

        expect(coords1).to.be.deep.almost([[76.314630721, 15.84204812, 0], [76.316776488, 15.841532053, 0]]);

        // click to get dragged link
        let link2 = (await editorTests.click(editor, 423, 125)).target;
        let coords2 = link2.coord();
        expect(coords2).to.be.deep.almost([[76.316776488, 15.841532053, 0], [76.316240046, 15.84204812, 0]]);


        // click to get dragged link
        let link3 = (await editorTests.click(editor, 200, 275)).target;
        let coords3 = link3.coord();
        expect(coords3).to.be.deep.almost([[76.314630721, 15.841012974, 0], [76.316776488, 15.841532053, 0]]);


        // click to get dragged link
        let link4 = (await editorTests.click(editor, 425, 275)).target;
        let coords4 = link4.coord();
        expect(coords4).to.be.deep.almost([[76.316776488, 15.841532053, 0], [76.316240046, 15.841012974, 0]]);
    });
});
