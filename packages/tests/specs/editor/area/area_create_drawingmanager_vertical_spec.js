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
import dataset from './area_create_drawingmanager_vertical_spec.json';

xdescribe('Area drawing manager points with same longitude ', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.08312571088209, latitude: 13.214838342327566},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        mapContainer = display.getContainer();
    });

    after(async function() {
        editor.destroy();
        display.destroy();
    });

    it('create area by drawing manager and validate', async function() {
        editor.getDrawingBoard().start({mode: features.Area});

        await testUtils.events.mousemove(mapContainer, {x: 100, y: 100}, {x: 100, y: 200});
        await testUtils.events.click(mapContainer, 100, 200);

        await testUtils.events.mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 100});
        await testUtils.events.click(mapContainer, 200, 100);

        await testUtils.events.mousemove(mapContainer, {x: 200, y: 100}, {x: 300, y: 150});
        await testUtils.events.click(mapContainer, 300, 150);

        await testUtils.events.mousemove(mapContainer, {x: 200, y: 100}, {x: 300, y: 170});
        await testUtils.events.click(mapContainer, 300, 170);

        await testUtils.events.mousemove(mapContainer, {x: 100, y: 310}, {x: 200, y: 200});
        await testUtils.events.click(mapContainer, 200, 200);

        editor.getDrawingBoard().create({featureClass: 'AREA'});

        let area = (await editorTests.click(editor, 271, 266)).target;

        expect(area.prop()).to.include({
            featureType: 2005700,
            height: 0
        });

        expect(area.coord()).to.deep.equal([[[
            [76.08151638547315, 13.215360578449165, 0],
            [76.08205282727613, 13.21588281345295, 0],
            [76.08205282727613, 13.215360578449165, 0],
            [76.08151638547315, 13.215360578449165, 0]
        ]]]);
    });
});
