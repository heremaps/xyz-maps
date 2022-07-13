/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
import {prepare} from 'utils';
import {waitForEditorReady, submit} from 'editorUtils';
import {click, mousemove} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './drawingmanager_spec.json';

describe('Create new Links then remove by drawingmanager', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;
    let linkLayer;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.98506, latitude: 12.88776},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('start drawingmanager', function() {
        editor.getDrawingBoard().start();

        expect(editor.getDrawingBoard().isActive()).to.be.true;
    });

    it('cancel drawingmanager', function() {
        editor.getDrawingBoard().cancel();

        expect(editor.getDrawingBoard().isActive()).to.be.false;
    });

    it('start drawingmanager again', async function() {
        editor.getDrawingBoard().start();

        expect(editor.getDrawingBoard().isActive()).to.be.true;

        await mousemove(mapContainer, {x: 150, y: 200}, {x: 200, y: 200});
        await click(mapContainer, 200, 200);

        await mousemove(mapContainer, {x: 150, y: 200}, {x: 150, y: 130});
        await click(mapContainer, 150, 130);

        await waitForEditorReady(editor, ()=>{
            link = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        });

        expect(link.coord()).to.deep.almost([
            [76.983987116, 12.888282928, 0],
            [76.983718895, 12.888648976, 0]
        ]);
    });

    it('submit and validate link again', async function() {
        await waitForEditorReady(editor, async ()=>{
            await submit(editor);
        });
        link = editor.getFeature(link.id, linkLayer);

        expect(link.coord()).to.deep.almost([
            [76.983987116, 12.888282928, 0],
            [76.983718895, 12.888648976, 0]
        ]);
    });
});
