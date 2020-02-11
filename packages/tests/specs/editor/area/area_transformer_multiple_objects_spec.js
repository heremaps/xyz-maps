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
import chaiAlmost from 'chai-almost';
import dataset from './area_transformer_multiple_objects_spec.json';

describe('area transform multiple objects', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let area1;
    let area2;
    let mapContainer;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 74.91579290930756, latitude: 12.968357297262258},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        mapContainer = display.getContainer();

        area1 = preparedData.getFeature('buildingLayer', -9076);
        area2 = preparedData.getFeature('buildingLayer', -9077);

        expect(area1).to.not.equal(null);
        expect(area2).to.not.equal(null);
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('validate two objects are added to container and start transformer', function() {
        let container = editor.createFeatureContainer();

        container.push(area1, area2);

        expect(container).to.have.lengthOf(2);

        container.transform();
    });

    it('drag to scale left', async function() {
        await testUtils.events.drag(mapContainer, {x: 435, y: 244}, {x: 405, y: 244});

        expect(area1.coord()).to.deep.almost([[[
            [74.91584632, 12.968749367, 0],
            [74.91584632, 12.968226607, 0],
            [74.916067303, 12.968226607, 0],
            [74.91619358, 12.968487987, 0],
            [74.91584632, 12.968749367, 0]
        ]]]);

        expect(area2.coord()).to.deep.almost([[[
            [74.916162012, 12.969010746, 0],
            [74.916162012, 12.968749367, 0],
            [74.916382995, 12.968697091, 0],
            [74.916162012, 12.969010746, 0]
        ]]]);
    });

    it('drag to scale right', async function() {
        await testUtils.events.drag(mapContainer, {x: 635, y: 244}, {x: 685, y: 244});

        expect(area1.coord()).to.deep.almost([[[
            [74.91584632, 12.968749367, 0],
            [74.91584632, 12.968226607, 0],
            [74.91612262, 12.968226607, 0],
            [74.916280507, 12.968487987, 0],
            [74.91584632, 12.968749367, 0]
        ]]]);

        expect(area2.coord()).to.deep.almost([[[
            [74.916241039, 12.969010746, 0],
            [74.916241039, 12.968749367, 0],
            [74.916517339, 12.968697091, 0],
            [74.916241039, 12.969010746, 0]
        ]]]);
    });


    it('drag to scale up', async function() {
        await testUtils.events.drag(mapContainer, {x: 550, y: 35}, {x: 550, y: 85});

        expect(area1.coord()).to.deep.almost([[[
            [74.91584632, 12.968661713, 0],
            [74.91584632, 12.968226607, 0],
            [74.91612262, 12.968226607, 0],
            [74.916280507, 12.968444158, 0],
            [74.91584632, 12.968661713, 0]
        ]]]);

        expect(area2.coord()).to.deep.almost([[[
            [74.916241039, 12.968879263, 0],
            [74.916241039, 12.968661713, 0],
            [74.916517339, 12.9686182, 0],
            [74.916241039, 12.968879263, 0]
        ]]]);
    });

    it('drag to scale down', async function() {
        await testUtils.events.drag(mapContainer, {x: 550, y: 365}, {x: 550, y: 335});

        expect(area1.coord()).to.deep.almost([[[
            [74.91584632, 12.968688116, 0],
            [74.91584632, 12.968305814, 0],
            [74.91612262, 12.968305814, 0],
            [74.916280507, 12.968496962, 0],
            [74.91584632, 12.968688116, 0]
        ]]]);

        expect(area2.coord()).to.deep.almost([[[
            [74.916241039, 12.968879263, 0],
            [74.916241039, 12.968688116, 0],
            [74.916517339, 12.968649882, 0],
            [74.916241039, 12.968879263, 0]
        ]]]);
    });


    it('drag to rotate', async function() {
        await testUtils.events.drag(mapContainer, {x: 680, y: 335}, {x: 580, y: 335});

        expect(area1.coord()).to.deep.almost([[[
            [74.915947279, 12.968845105, 0],
            [74.915741947, 12.968519349, 0],
            [74.915977378, 12.968378423, 0],
            [74.916214578, 12.968460769, 0],
            [74.915947279, 12.968845105, 0]
        ]]]);

        expect(area2.coord()).to.deep.almost([[[
            [74.916386281, 12.968806654, 0],
            [74.916283616, 12.96864378, 0],
            [74.916498513, 12.968470274, 0],
            [74.916386281, 12.968806654, 0]
        ]]]);
    });

    it('drag to move', async function() {
        await testUtils.events.drag(mapContainer, {x: 520, y: 200}, {x: 480, y: 200});

        expect(area1.coord()).to.deep.almost([[[
            [74.915839992, 12.968845106, 0],
            [74.915634658, 12.968519349, 0],
            [74.91587009, 12.968378423, 0],
            [74.91610729, 12.968460769, 0],
            [74.915839992, 12.968845106, 0]
        ]]]);

        expect(area2.coord()).to.deep.almost([[[
            [74.916278993, 12.968806654, 0],
            [74.916176328, 12.96864378, 0],
            [74.916391225, 12.968470274, 0],
            [74.916278993, 12.968806654, 0]
        ]]]);
    });


    xit('drag at blank area and validate objects are not transformed', async function() {
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 540, y: 200}, {x: 540, y: 240});
        });
        expect(area1.coord()).to.deep.almost([[[
            [74.915839992, 12.968845106, 0],
            [74.915634658, 12.968519349, 0],
            [74.91587009, 12.968378423, 0],
            [74.91610729, 12.968460769, 0],
            [74.915839992, 12.968845106, 0]
        ]]]);

        expect(area2.coord()).to.deep.almost([[[
            [74.916278993, 12.968806654, 0],
            [74.916176328, 12.96864378, 0],
            [74.916391225, 12.968470274, 0],
            [74.916278993, 12.968806654, 0]
        ]]]);
    });

    it('validate two objects are modified', async function() {
        // hide transformer
        await testUtils.events.click(mapContainer, 100, 50);
        expect(editor.info()).to.have.lengthOf(2);
    });
});
