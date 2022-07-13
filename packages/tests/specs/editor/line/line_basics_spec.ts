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
import {click, drag, mousemove} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor, DrawingShape, Line} from '@here/xyz-maps-editor';
// @ts-ignore @deprecated
import {features} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './line_basics_spec.json';

describe('basic line tests', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let line;

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

    it('create line by drawing manager', async function() {
        editor.getDrawingBoard().start({mode: features.Line});

        await mousemove(mapContainer, {x: 100, y: 100}, {x: 100, y: 200});
        await click(mapContainer, 100, 200);

        await mousemove(mapContainer, {x: 200, y: 100}, {x: 200, y: 100});
        await click(mapContainer, 200, 100);

        await mousemove(mapContainer, {x: 200, y: 100}, {x: 300, y: 200});
        await click(mapContainer, 300, 200);

        let point = <DrawingShape>(await editorClick(editor, 200, 100)).target;
        point.remove();

        await mousemove(mapContainer, {x: 200, y: 100}, {x: 200, y: 300});
        await click(mapContainer, 200, 300);

        await drag(mapContainer, {x: 100, y: 200}, {x: 400, y: 300});

        let shape = <DrawingShape>(await editorClick(editor, 400, 300)).target;

        expect(shape.getIndex()).to.equal(0);
        expect(shape.getLength()).to.equal(3);

        line = editor.getDrawingBoard().create({featureClass: 'LINE'});
    });

    // 1204.25 366.7
    it('validate line geometry', async function() {
        let selected = <Line>(await editorClick(editor, 400, 300)).target;
        expect(selected.coord()).to.deep.almost([
            [76.083125712, 13.214838342, 0],
            [76.082589269, 13.215360578, 0],
            [76.082052827, 13.214838342, 0]
        ]);
    });

    it('modify geometry by dragging shape ', async function() {
        await drag(mapContainer, {x: 400, y: 300}, {x: 300, y: 400});

        expect(line.coord()).to.deep.almost([
            [76.082589270, 13.214316105, 0],
            [76.082589269, 13.215360578, 0],
            [76.082052827, 13.214838342, 0]
        ]);
    });


    it('remove shape', async function() {
        let shape = <DrawingShape>(await editorClick(editor, 300, 400)).target;

        shape.remove();

        expect(line.coord()).to.deep.almost([
            [76.082589269, 13.215360578, 0],
            [76.082052827, 13.214838342, 0]
        ]);
    });

    it('modify geometry by dragging virtual shape', async function() {
        line.select();

        await drag(mapContainer, {x: 250, y: 250}, {x: 350, y: 350});

        expect(line.coord()).to.deep.almost([
            [76.082589269, 13.215360578, 0],
            [76.082857490, 13.214577223, 0],
            [76.082052827, 13.214838342, 0]
        ]);
    });

    it('remove line', async function() {
        let {id} = line;
        let feature = editor.search({id: id}).pop();

        feature.remove();

        let result = editor.search({id: id});

        expect(result.length).to.equal(0);
    });
});
