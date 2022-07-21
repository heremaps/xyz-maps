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
import dataset from './area_connected_spec.json';

describe('modify connected areas', () => {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let areaLayer;
    let area1;
    let area2;

    before(async () => {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: -74.01036517786105, latitude: 40.705206924491875},
            zoomlevel: 16,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);

        mapContainer = display.getContainer();

        area1 = preparedData.getFeature('buildingLayer', 'A1');
        area2 = preparedData.getFeature('buildingLayer', 'A2');
        areaLayer = preparedData.getLayers('buildingLayer');
    });

    after(async () => {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('select area 1', () => {
        area1.select();
        expect(area1.coord()[0]).to.have.lengthOf(4);
    });

    it('drag "not connected shape" and validate geometry', async () => {
        area1.select();

        await drag(mapContainer, {x: 270, y: 298}, {x: 276, y: 378});

        expect(area1.coord()).to.deep.almost([[
            [-74.01302593, 40.703938124, 0],
            [-74.0088631419824, 40.70520692619138],
            [-74.01100890908656, 40.70195354163019],
            [-74.01302593, 40.703938124, 0]
        ]]);
    });

    it('drag "connected shape" and validate geometries', async () => {
        area1.select();

        await drag(mapContainer, {x: 469, y: 301}, {x: 511, y: 349});

        expect(area1.coord()).to.deep.almost([[
            [-74.01302593, 40.703938124, 0],
            [-74.007983378, 40.70440986, 0],
            [-74.01100890908656, 40.70195354163019],
            [-74.01302593, 40.703938124, 0]
        ]]);

        expect(area2.coord()).to.deep.almost([[
            [-74.007983378, 40.70440986],
            [-74.00457160777405, 40.70520692619138],
            [-74.00671737487824, 40.70195354163019],
            [-74.007983378, 40.70440986]
        ]]);
    });

    it('validate history', () => {
        let info = editor.info();

        expect(info.length).to.equal(2);
        expect(info[0].id).to.equal('A1');
        expect(info[1].id).to.equal('A2');
    });

    it('undo and validate', () => {
        editor.undo();
        let info = editor.info();

        expect(info.length).to.equal(1);
        expect(info[0].id).to.equal('A1');
    });
});
