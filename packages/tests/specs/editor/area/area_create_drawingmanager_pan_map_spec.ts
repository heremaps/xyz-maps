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
import {waitForEditorReady, editorClick} from 'editorUtils';
import {drag, click, mousemove} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor, DrawingShape} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './area_create_drawingmanager_pan_map_spec.json';

describe('Area drawing manager and pan map', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.08312571088209, latitude: 13.214838342327566},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);

        mapContainer = display.getContainer();
    });

    after(async function() {
        editor.destroy();
        display.destroy();
    });

    it('draw area with drawing manager and validate', async function() {
        editor.getDrawingBoard().start({mode: 'Area'});


        // add a shape point
        await mousemove(mapContainer, {x: 100, y: 100}, {x: 100, y: 200});
        await click(mapContainer, 100, 200);


        // add one more shape point
        await mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 100});
        await click(mapContainer, 200, 100);


        // add one more shape point
        await mousemove(mapContainer, {x: 200, y: 100}, {x: 300, y: 250});
        await click(mapContainer, 300, 250);


        // click on shape point and remove
        let shape = <DrawingShape>(await editorClick(editor, 200, 100)).target;
        shape.remove();


        // click on another shape point
        await mousemove(mapContainer, {x: 200, y: 100}, {x: 200, y: 350});
        await click(mapContainer, 200, 350);

        // drag the shape point
        await drag(mapContainer, {x: 200, y: 350}, {x: 400, y: 350});

        // click on a shape point
        shape = <DrawingShape>(await editorClick(editor, 300, 250)).target;

        expect(shape.getIndex()).to.equal(1);
        expect(shape.getLength()).to.equal(3);

        // drag map to move area outside of viewport
        await waitForEditorReady(editor, async ()=>{
            await drag(mapContainer, {x: 500, y: 100}, {x: 100, y: 100});
        });
    });


    it('creat area and then drag map back, validate created area', async function() {
        await waitForEditorReady(editor, async ()=>{
            editor.getDrawingBoard().create({featureClass: 'AREA'});
        });

        // drag map to move area back to viewport
        await waitForEditorReady(editor, async ()=>{
            await drag(mapContainer, {x: 100, y: 100}, {x: 500, y: 100});
        });

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(1);

        expect(objs[0].coord()).to.deep.almost([[[
            [76.081516385, 13.215360578, 0],
            [76.082589269, 13.215099461, 0],
            [76.083125711, 13.214577224, 0],
            [76.081516385, 13.215360578, 0]
        ]]]);
    });
});
