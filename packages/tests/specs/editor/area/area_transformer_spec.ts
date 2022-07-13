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
import dataset from './area_transformer_spec.json';

describe('area transformer', () => {
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
            center: {longitude: 74.82185256187489, latitude: 12.901112606690091},
            zoomlevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);

        mapContainer = display.getContainer();

        area = preparedData.getFeature('buildingLayer', -9078);
    });

    after(async () => {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('validate area coordinate and activate transformer', () => {
        expect(area.coord()).to.deep.almost([[[
            [74.82131612, 12.901112607, 0],
            [74.82131612, 12.900589706, 0],
            [74.821852562, 12.901112607, 0],
            [74.82131612, 12.901112607, 0]
        ]]]);

        area.transform();
    });


    it('drag to scale left', async () => {
        await drag(mapContainer, {x: 185, y: 400}, {x: 200, y: 400});

        expect(area.coord()).to.deep.almost([[[
            [74.82135612, 12.901112607, 0],
            [74.82135612, 12.900589706, 0],
            [74.821852562, 12.901112607, 0],
            [74.82135612, 12.901112607, 0]
        ]]]);
    });

    it('drag to scale right', async () => {
        await drag(mapContainer, {x: 415, y: 400}, {x: 400, y: 400});

        expect(area.coord()).to.deep.almost([[[
            [74.82135612, 12.901112607, 0],
            [74.82135612, 12.900589706, 0],
            [74.821812562, 12.901112607, 0],
            [74.82135612, 12.901112607, 0]
        ]]]);
    });


    it('drag to scale up', async () => {
        await drag(mapContainer, {x: 300, y: 285}, {x: 300, y: 250});

        expect(area.coord()).to.deep.almost([[[
            [74.82135612, 12.901203332, 0],
            [74.82135612, 12.900589706, 0],
            [74.821812562, 12.901203332, 0],
            [74.82135612, 12.901203332, 0]
        ]]]);
    });


    it('drag to scale down', async () => {
        await drag(mapContainer, {x: 300, y: 515}, {x: 300, y: 450});

        // console.log(area.coord());
        //
        //
        // preparedData.getLayers('buildingLayer').addFeature({
        //     'type': 'Feature',
        //     'properties': {
        //         'featureClass': 'AREA',
        //         'type': 'building'
        //     },
        //     'geometry': {
        //         'type': 'MultiPolygon',
        //         'coordinates': [[[
        //             [74.82135612, 12.901203332, 0],
        //             [74.82135612, 12.900760431, 0],
        //             [74.821812562, 12.901203332, 0],
        //             [74.82135612, 12.901203332, 0]
        //         ]]]
        //     }
        // }, [{
        //     type: 'Polygon',
        //     zIndex: 9,
        //     fill: 'blue',
        //     opacity: .4
        // }]);

        expect(area.coord()).to.deep.almost([[[
            [74.821355627, 12.901203664, 0],
            [74.821355627, 12.900759003, 0],
            [74.82181316, 12.901203664, 0],
            [74.821355627, 12.901203664, 0]
        ]]]);
    });

    it('drag to move', async () => {
        await drag(mapContainer, {x: 300, y: 350}, {x: 320, y: 300});
        expect(area.coord()).to.deep.almost([[[
            [74.821409272, 12.901334389, 0],
            [74.821409272, 12.900889728, 0],
            [74.821866805, 12.901334389, 0],
            [74.821409272, 12.901334389, 0]
        ]]]);
    });

    it('drag to rotate', async () => {
        await drag(mapContainer, {x: 420, y: 400}, {x: 400, y: 400});

        expect(area.coord()).to.deep.almost([[[
            [74.821435871, 12.901357663, 0],
            [74.821385474, 12.900915724, 0],
            [74.821890603, 12.901308393, 0],
            [74.821435871, 12.901357663, 0]
        ]]]);
    });

    it('drag blank area, validate area is not transformed', async () => {
        // drag inside transformer also transforms area
        await waitForEditorReady(editor, async () => {
            await drag(mapContainer, {x: 380, y: 300}, {x: 380, y: 330});
        });
        expect(area.coord()).to.deep.almost([[[
            [74.821435871, 12.901357663, 0],
            [74.821385474, 12.900915724, 0],
            [74.821890603, 12.901308393, 0],
            [74.821435871, 12.901357663, 0]
        ]]]);
    });
});
