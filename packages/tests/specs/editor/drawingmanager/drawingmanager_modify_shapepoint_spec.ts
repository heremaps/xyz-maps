/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
import {waitForEditorReady, editorClick} from 'editorUtils';
import {click, drag, mousemove} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor, DrawingShape} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './drawingmanager_modify_shapepoint_spec.json';

describe('Create new Link by drawing manager and remove some shape points', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.98670509884607, latitude: 12.88815358638164},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
    });

    it('start drawingmanager, add and remove some shapes and then create', async function() {
        editor.getDrawingBoard().start();

        let mapContainer = display.getContainer();

        await mousemove(mapContainer, {x: 100, y: 80}, {x: 100, y: 100});
        await click(mapContainer, 100, 100);

        await mousemove(mapContainer, {x: 100, y: 200}, {x: 100, y: 300});
        await click(mapContainer, 100, 300);

        await mousemove(mapContainer, {x: 100, y: 100}, {x: 100, y: 200});
        await click(mapContainer, 100, 200);

        await drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});


        var shape = <DrawingShape>(await editorClick(editor, 100, 300)).target;
        shape.remove();

        expect(editor.getDrawingBoard().getLength()).to.equal(2);

        editor.getDrawingBoard().addShape({x: 200, y: 200});

        editor.getDrawingBoard().addShape({x: 300, y: 250});

        editor.getDrawingBoard().addShape({x: 300, y: 300});

        expect(editor.getDrawingBoard().getLength()).to.equal(5);

        shape = <DrawingShape>(await editorClick(editor, 200, 200)).target;
        shape.remove();

        shape = <DrawingShape>(await editorClick(editor, 100, 200)).target;
        shape.remove();

        editor.getDrawingBoard().removeShape(0);

        expect(editor.getDrawingBoard().getLength()).to.equal(2);

        let lnk = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});

        expect(lnk.coord()).to.deep.almost([
            [76.986168657, 12.88841505, 0],
            [76.986168657, 12.888153586, 0]
        ]);

        expect(editor.getDrawingBoard().isActive()).to.be.false;
    });
});
