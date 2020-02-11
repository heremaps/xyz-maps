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
 */import {editorTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './drawingmanager_create_and_split_original_spec.json';

describe('Create new Links and split original link', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 79.26345, latitude: 13.04889},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
        link = preparedData.getFeature('linkLayer', -188849);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('draw link with connectTo link and validate it', async function() {
        editor.getDrawingBoard().start({
            position: {x: 143, y: 95},
            connectTo: link
        });

        await testUtils.events.mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 200});
        await testUtils.events.click(mapContainer, 200, 200);

        let lnk;
        await editorTests.waitForEditorReady(editor, ()=>{
            lnk = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        });
        let lnk1 = editor.info()[1];
        let lnk2 = editor.info()[2];

        expect(lnk1.geometry.coordinates).to.deep.almost([
            [79.262377116, 13.049935177, 0],
            [79.262071345, 13.049935177, 0]
        ]);

        expect(lnk2.geometry.coordinates).to.deep.almost([
            [79.262071345, 13.049935177, 0],
            [79.261840675, 13.049935177, 0]
        ]);

        expect(lnk.coord()).to.deep.almost([
            [79.262071345, 13.049935177, 0],
            [79.262377116, 13.049412589, 0]
        ]);
    });

    it('submit and validate', async function() {
        let monitor = new testUtils.MonitorXHR();
        await editorTests.waitForEditorReady(editor, async ()=>{
            await editorTests.submit(editor);
        });
        let reqs = monitor.stop({method: 'post'});
        expect(reqs).to.have.lengthOf(1);
        let payload = reqs[0].payload;

        expect(payload.features).to.have.lengthOf(3);
        expect(payload.features[0].type).to.equal('Feature');
        expect(payload.features[0].geometry.coordinates).to.deep.almost([
            [79.262377116, 13.049935177, 0],
            [79.262071345, 13.049935177, 0]
        ]);
        expect(payload.features[0].properties).to.deep.include({
            'featureClass': 'NAVLINK'
        });


        expect(payload.features[1].type).to.equal('Feature');
        expect(payload.features[1].geometry.coordinates).to.deep.almost([
            [79.262071345, 13.049935177, 0],
            [79.261840675, 13.049935177, 0]
        ]);
        expect(payload.features[1].properties).to.deep.include({
            'featureClass': 'NAVLINK'
        });


        expect(payload.features[2].type).to.equal('Feature');
        expect(payload.features[2].geometry.coordinates).to.deep.almost([
            [79.262071345, 13.049935177, 0],
            [79.262377116, 13.049412589, 0]
        ]);
        expect(payload.features[2].properties).to.deep.include({
            'featureClass': 'NAVLINK'
        });
    });
});
