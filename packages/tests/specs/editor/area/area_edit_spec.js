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
import dataset from './area_edit_spec.json';

describe('area add and remove shape point', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let areaLayer;
    let area;
    let areashp;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: -111.717195, latitude: 40.211738},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        mapContainer = display.getContainer();

        area = preparedData.getFeature('buildingLayer', -9074);
        areaLayer = preparedData.getLayers('buildingLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('get an area object and select', function() {
        area.select();

        expect(area.coord()[0][0]).to.have.lengthOf(5);
    });

    it('drag a middle point to add shape point and validate', async function() {
        area.select();

        await testUtils.events.drag(mapContainer, {x: 300, y: 300}, {x: 300, y: 250});

        expect(area.coord()).to.deep.equal([[[
            [-111.718267489, 40.211738323, 0],
            [-111.718267489, 40.210918996, 0],
            [-111.717194605, 40.210918996, 0],
            [-111.717194605, 40.211738323, 0],
            [-111.717731047, 40.211943153],
            [-111.718267489, 40.211738323, 0]
        ]]]);
    });

    it('click to remove a shape point and validate', async function() {
        areashp = (await editorTests.click(editor, 200, 500)).target;
        areashp.remove();

        expect(area.coord()).to.deep.equal([[[
            [-111.718267489, 40.211738323, 0],
            [-111.717194605, 40.210918996, 0],
            [-111.717194605, 40.211738323, 0],
            [-111.717731047, 40.211943153],
            [-111.718267489, 40.211738323, 0]
        ]]]);
    });

    it('drag middle point to add shape point again', async function() {
        await testUtils.events.drag(mapContainer, {x: 400, y: 400}, {x: 450, y: 400});

        expect(area.coord()).to.deep.equal([[[
            [-111.718267489, 40.211738323, 0],
            [-111.717194605, 40.210918996, 0],
            [-111.716926385, 40.21132866],
            [-111.717194605, 40.211738323, 0],
            [-111.717731047, 40.211943153],
            [-111.718267489, 40.211738323, 0]
        ]]]);
    });

    it('submit and validate coord', async function() {
        await editorTests.waitForEditorReady(editor, async ()=>{
            await editorTests.submit(editor);
        });

        let a = editor.getFeature(area.id, areaLayer);

        expect(a.coord()).to.deep.equal([[[
            [-111.718267489, 40.211738323, 0],
            [-111.717194605, 40.210918996, 0],
            [-111.716926385, 40.21132866],
            [-111.717194605, 40.211738323, 0],
            [-111.717731047, 40.211943153],
            [-111.718267489, 40.211738323, 0]
        ]]]);
    });
});
