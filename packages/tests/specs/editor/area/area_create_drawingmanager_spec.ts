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
import {Editor} from '@here/xyz-maps-editor';
// @ts-ignore @deprecated
import {features} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './area_create_drawingmanager_spec.json';

describe('Area drawing manager without panning the map', function() {
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

    it('create area by drawing manager', async function() {
        editor.getDrawingBoard().start({mode: features.Area});


        await mousemove(mapContainer, {x: 100, y: 100}, {x: 100, y: 200});
        await click(mapContainer, 100, 200);


        await mousemove(mapContainer, {x: 200, y: 100}, {x: 200, y: 100});
        await click(mapContainer, 200, 100);


        await mousemove(mapContainer, {x: 200, y: 100}, {x: 300, y: 200});
        await click(mapContainer, 300, 200);

        let point = (await editorClick(editor, 200, 100)).target;
        point.remove();

        await mousemove(mapContainer, {x: 200, y: 100}, {x: 200, y: 300});
        await click(mapContainer, 200, 300);


        await drag(mapContainer, {x: 100, y: 200}, {x: 400, y: 300});


        let shape = (await editorClick(editor, 400, 300)).target;

        expect(shape.getIndex()).to.equal(0);
        expect(shape.getLength()).to.equal(3);


        editor.getDrawingBoard().create({featureClass: 'AREA'});
    });

    // 1204.25 366.7
    it('validate created area', async function() {
        let area = (await editorClick(editor, 271, 266)).target;

        expect(area.coord()).to.deep.almost([[[
            [76.08312571, 13.214838342, 0],
            [76.082589269, 13.215360578, 0],
            [76.082052827, 13.214838342, 0],
            [76.08312571, 13.214838342, 0]
        ]]]);
    });
});
