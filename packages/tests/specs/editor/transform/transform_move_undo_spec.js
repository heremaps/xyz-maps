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
import dataset from './transform_move_undo_spec.json';

describe('undo the link transforming, link should connect to its connected links', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;

    var link1;
    var linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 78.19335420161838, latitude: 12.548568361911578},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        link1 = preparedData.getFeature('linkLayer', '-189183');
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate connected links on the shape point', async function() {
        link1.select();
        let shp = (await editorTests.click(editor, 200, 200)).target;

        expect(shp.getConnectedLinks()).to.have.lengthOf(2);

        expect(link1.coord()).to.deep.equal([[78.192281318, 12.549091989, 0], [78.191744876, 12.549091989, 0]]);
    });

    it('transform the link and validate', async function() {
        link1.transform();
        let mapContainer = display.getContainer();
        await testUtils.events.drag(mapContainer, {x: 150, y: 200}, {x: 150, y: 250});

        expect(link1.coord()).to.deep.equal([
            [78.192281318, 12.548830174, 0],
            [78.191744876, 12.548830174, 0]
        ]);
    });


    it('undo the change and validate the link still connects to other links', async function() {
        editor.undo();
        let lnk = editor.getFeature(link1.id, linkLayer);
        lnk.select();
        let shp = (await editorTests.click(editor, 200, 200)).target;

        expect(shp.getConnectedLinks()).to.have.lengthOf(2);

        expect(lnk.coord()).to.deep.equal([[78.192281318, 12.549091989, 0], [78.191744876, 12.549091989, 0]]);
    });
});
