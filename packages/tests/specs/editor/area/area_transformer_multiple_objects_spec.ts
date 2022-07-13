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
import {waitForEditorReady} from 'editorUtils';
import {prepare, TestData} from 'utils';
import {click, drag} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './area_transformer_multiple_objects_spec.json';

describe('area transform multiple objects', () => {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData: TestData;
    let area1;
    let area2;
    let mapContainer;

    before(async () => {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 74.91579290930756, latitude: 12.968357297262258},
            zoomlevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);

        mapContainer = display.getContainer();

        area1 = preparedData.getFeature('buildingLayer', -9076);
        area2 = preparedData.getFeature('buildingLayer', -9077);


        expect(area1).to.not.equal(null);
        expect(area2).to.not.equal(null);
    });

    after(async () => {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('validate two objects are added to container and start transformer', () => {
        let container = editor.createFeatureContainer();

        container.push(area1, area2);

        expect(container).to.have.lengthOf(2);

        container.transform();
    });

    it('drag to scale left', async () => {
        await drag(mapContainer, {x: 435, y: 244}, {x: 405, y: 244});

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
    })
    ;

    it('drag to scale right', async () => {
        await drag(mapContainer, {x: 635, y: 244}, {x: 685, y: 244});

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


    it('drag to scale up', async () => {
        await drag(mapContainer, {x: 550, y: 35}, {x: 550, y: 85});

        expect(area1.coord()).to.deep.almost([[[
            [74.915847117, 12.968662454, 0],
            [74.915847117, 12.968226607, 0],
            [74.916122845, 12.968226607, 0],
            [74.916280403, 12.96844453, 0],
            [74.915847117, 12.968662454, 0]
        ]]]);

        expect(area2.coord()).to.deep.almost([[[
            [74.916241014, 12.968880375, 0],
            [74.916241014, 12.968662454, 0],
            [74.91651674, 12.968618869, 0],
            [74.916241014, 12.968880375, 0]
        ]]]);
    });

    it('drag to scale down', async () => {
        await drag(mapContainer, {x: 550, y: 365}, {x: 550, y: 335});
        expect(area1.coord()).to.deep.almost([[[
            [74.915847117, 12.968688459, 0],
            [74.915847117, 12.968304619, 0],
            [74.916122845, 12.968304619, 0],
            [74.916280403, 12.968496538, 0],
            [74.915847117, 12.968688459, 0]
        ]]]);

        expect(area2.coord()).to.deep.almost([[[
            [74.916241014, 12.968880375, 0],
            [74.916241014, 12.968688459, 0],
            [74.91651674, 12.968650075, 0],
            [74.916241014, 12.968880375, 0]
        ]]]);
    });


    it('drag to rotate', async () => {
        await drag(mapContainer, {x: 680, y: 335}, {x: 580, y: 335});

        expect(area1.coord()).to.deep.almost([[[
            [74.915948223, 12.968845072, 0],
            [74.915742008, 12.96851804, 0],
            [74.915976929, 12.968377368, 0],
            [74.916214276, 12.968460499, 0],
            [74.915948223, 12.968845072, 0]
        ]]]);

        expect(area2.coord()).to.deep.almost([[[
            [74.916386929, 12.968807625, 0],
            [74.916283824, 12.968644112, 0],
            [74.916498121, 12.968470738, 0],
            [74.916386929, 12.968807625, 0]
        ]]]);
    });

    it('drag to move', async () => {
        await drag(mapContainer, {x: 545, y: 210}, {x: 505, y: 210});

        expect(area1.coord()).to.deep.almost([[[
            [74.915840935, 12.968845072, 0],
            [74.91563472, 12.96851804, 0],
            [74.915869641, 12.968377368, 0],
            [74.916106988, 12.968460499, 0],
            [74.915840935, 12.968845072, 0]
        ]]]);

        expect(area2.coord()).to.deep.almost([[[
            [74.916279641, 12.968807625, 0],
            [74.916176536, 12.968644112, 0],
            [74.916390833, 12.968470738, 0],
            [74.916279641, 12.968807625, 0]
        ]]]);
    });

    it('validate two objects are modified', async () => {
        // hide transformer
        await click(mapContainer, 100, 50);
        expect(editor.info()).to.have.lengthOf(2);
    });
});
