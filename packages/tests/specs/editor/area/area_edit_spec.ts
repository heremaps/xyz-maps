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
import {waitForEditorReady, editorClick, submit} from 'editorUtils';
import {drag} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './area_edit_spec.json';

describe('modify area geometry', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let areaLayer;
    let area;
    let areashp;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: -111.717195, latitude: 40.211738},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);

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

        await drag(mapContainer, {x: 300, y: 300}, {x: 300, y: 250});

        expect(area.coord()).to.deep.almost([[[
            [-111.718267489, 40.211738323, 0],
            [-111.718267489, 40.210918996, 0],
            [-111.717194605, 40.210918996, 0],
            [-111.717194605, 40.211738323, 0],
            [-111.717731047, 40.211943153],
            [-111.718267489, 40.211738323, 0]
        ]]]);
    });

    it('click to remove a shape point and validate', async function() {
        areashp = (await editorClick(editor, 200, 500)).target;
        areashp.remove();

        expect(area.coord()).to.deep.almost([[[
            [-111.718267489, 40.211738323, 0],
            [-111.717194605, 40.210918996, 0],
            [-111.717194605, 40.211738323, 0],
            [-111.717731047, 40.211943153],
            [-111.718267489, 40.211738323, 0]
        ]]]);
    });

    it('drag middle point to add shape point again', async function() {
        await drag(mapContainer, {x: 400, y: 400}, {x: 450, y: 400});

        expect(area.coord()).to.deep.almost([[[
            [-111.718267489, 40.211738323, 0],
            [-111.717194605, 40.210918996, 0],
            [-111.716926385, 40.21132866],
            [-111.717194605, 40.211738323, 0],
            [-111.717731047, 40.211943153],
            [-111.718267489, 40.211738323, 0]
        ]]]);
    });

    it('submit and validate coord', async function() {
        await waitForEditorReady(editor, async () => {
            await submit(editor);
        });

        let a = editor.getFeature(area.id, areaLayer);

        expect(a.coord()).to.deep.almost([[[
            [-111.718267489, 40.211738323, 0],
            [-111.717194605, 40.210918996, 0],
            [-111.716926385, 40.21132866],
            [-111.717194605, 40.211738323, 0],
            [-111.717731047, 40.211943153],
            [-111.718267489, 40.211738323, 0]
        ]]]);
    });

    it('add a hole', async function() {
        area.addHole({x: 360, y: 370});

        expect(area.coord()).to.deep.almost([[[
            [-111.718267489, 40.211738323, 0],
            [-111.717194605, 40.210918996, 0],
            [-111.716926385, 40.21132866],
            [-111.717194605, 40.211738323, 0],
            [-111.717731047, 40.211943153],
            [-111.718267489, 40.211738323, 0]
        ], [
            [-111.717575873, 40.211324241, 0],
            [-111.717575873, 40.211578232, 0],
            [-111.717243279, 40.211578232, 0],
            [-111.717243279, 40.211324241, 0],
            [-111.717575873, 40.211324241, 0]
        ]]]);
    });
});
