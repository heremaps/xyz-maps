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
import {waitForEditorReady} from 'editorUtils';
import {drag} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './transform_area_spec.json';

describe('transform area objects', () => {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let area;

    before(async () => {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        mapContainer = display.getContainer();
        area = preparedData.getFeature('buildingLayer', '-9084');
    });

    after(async () => {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('scale area with transformer and validate its coordinates', async () => {
        area.transform();

        await drag(mapContainer, {x: 307 + 6, y: 260}, {x: 347 + 6, y: 260});

        expect(area.coord()).to.deep.almost([[[
            [77.797686602, 12.622401739, 0],
            [77.796410675, 12.622244695, 0],
            [77.797048639, 12.621878261, 0],
            [77.797686602, 12.622401739, 0]
        ]]]);
    });

    it('move area with transformer and validate its coordinates', async () => {
        await drag(mapContainer, {x: 220, y: 300}, {x: 240, y: 350});

        expect(area.coord()).to.deep.almost([[[
            [77.797793893, 12.622139999, 0],
            [77.796517966, 12.621982955, 0],
            [77.79715593, 12.621616521, 0],
            [77.797793893, 12.622139999, 0]
        ]]]);
    });

    it('rotate area with transformer and validate its coordinates', async () => {
        await drag(mapContainer, {x: 370, y: 410}, {x: 300, y: 450});

        expect(area.coord()).to.deep.almost([[[
            [77.797834836, 12.62174725, 0],
            [77.796686946, 12.622313097, 0],
            [77.797005983, 12.621661241, 0],
            [77.797834836, 12.62174725, 0]
        ]]]);
    });
});
