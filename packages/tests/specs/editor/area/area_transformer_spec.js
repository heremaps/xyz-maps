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
import {editorTests, displayTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './area_transformer_spec.json';

describe('area transformer', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let area;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 74.82185256187489, latitude: 12.901112606690091},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        mapContainer = display.getContainer();

        area = preparedData.getFeature('buildingLayer', -9078);
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('validate area coordinate and activate transformer', function() {
        expect(area.coord()).to.deep.equal([[[
            [74.82131612, 12.901112607, 0],
            [74.82131612, 12.900589706, 0],
            [74.821852562, 12.901112607, 0],
            [74.82131612, 12.901112607, 0]
        ]]]);

        area.transform();
    });


    it('drag to scale left', async function() {
        await testUtils.events.drag(mapContainer, {x: 185, y: 400}, {x: 200, y: 400});

        expect(area.coord()).to.deep.equal([[[
            [74.82135612, 12.901112607, 0],
            [74.82135612, 12.900589706, 0],
            [74.821852562, 12.901112607, 0],
            [74.82135612, 12.901112607, 0]
        ]]]);
    });

    it('drag to scale right', async function() {
        await testUtils.events.drag(mapContainer, {x: 415, y: 400}, {x: 400, y: 400});

        expect(area.coord()).to.deep.equal([[[
            [74.82135612, 12.901112607, 0],
            [74.82135612, 12.900589706, 0],
            [74.821812562, 12.901112607, 0],
            [74.82135612, 12.901112607, 0]
        ]]]);
    });


    it('drag to scale up', async function() {
        await testUtils.events.drag(mapContainer, {x: 300, y: 285}, {x: 300, y: 250});

        expect(area.coord()).to.deep.equal([[[
            [74.82135612, 12.901203332, 0],
            [74.82135612, 12.900589706, 0],
            [74.821812562, 12.901203332, 0],
            [74.82135612, 12.901203332, 0]
        ]]]);
    });


    it('drag to scale down', async function() {
        await testUtils.events.drag(mapContainer, {x: 300, y: 515}, {x: 300, y: 450});

        expect(area.coord()).to.deep.equal([[[
            [74.82135612, 12.901203332, 0],
            [74.82135612, 12.900760431, 0],
            [74.821812562, 12.901203332, 0],
            [74.82135612, 12.901203332, 0]
        ]]]);
    });

    it('drag to move', async function() {
        await testUtils.events.drag(mapContainer, {x: 300, y: 350}, {x: 320, y: 300});

        expect(area.coord()).to.deep.equal([[[
            [74.821409765, 12.901334057, 0],
            [74.821409765, 12.900891156, 0],
            [74.821866207, 12.901334057, 0],
            [74.821409765, 12.901334057, 0]
        ]]]);
    });


    it('drag to rotate', async function() {
        await testUtils.events.drag(mapContainer, {x: 420, y: 400}, {x: 400, y: 400});

        expect(area.coord()).to.deep.equal([[[
            [74.821436249, 12.901357269, 0],
            [74.821386073, 12.900917077, 0],
            [74.821889899, 12.901308136, 0],
            [74.821436249, 12.901357269, 0]
        ]]]);
    });


    xit('drag blank area, validate area is not transformed', async function() {
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 380, y: 300}, {x: 380, y: 380});
        });
        expect(area.coord()).to.deep.equal([[[
            [74.821436249, 12.901357269, 0],
            [74.821386073, 12.900917077, 0],
            [74.821889899, 12.901308136, 0],
            [74.821436249, 12.901357269, 0]
        ]]]);
    });
});
