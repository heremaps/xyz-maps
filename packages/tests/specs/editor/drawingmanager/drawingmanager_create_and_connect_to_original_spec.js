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
import dataset from './drawingmanager_create_and_connect_to_original_spec.json';

describe('Create new Links and connect to original link', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.221332, latitude: 13.151157},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -188847);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });


    it('create link with connectTo link', async function() {
        editor.getDrawingBoard().start({
            position: {x: 200, y: 100},
            connectTo: link
        });

        await testUtils.events.mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 200});
        await testUtils.events.click(mapContainer, 200, 200);

        let lnk;
        await editorTests.waitForEditorReady(editor, async ()=>{
            lnk = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        });

        expect(lnk.coord()).to.deep.equal([
            [77.220259106, 13.152202639, 0],
            [77.220259116, 13.151679372, 0]
        ]);
    });


    it('validate the connect shape point', async function() {
        await testUtils.events.click(mapContainer, 200, 120);
        let linkshape = (await editorTests.click(editor, 200, 100)).target;

        let lnk = linkshape.getConnectedLinks();

        expect(lnk).to.have.lengthOf(1);
        expect(lnk[0].id).to.equal(link.id);
    });

    it('submit links and verify', async function() {
        let monitor = new testUtils.MonitorXHR();

        await editorTests.waitForEditorReady(editor, async ()=>{
            await editorTests.submit(editor);
        });
        let reqs = monitor.stop({method: 'post'});
        expect(reqs).to.have.lengthOf(1);

        let payload = reqs[0].payload;

        expect(payload.features).to.have.lengthOf(1);
        expect(payload.features[0].type).to.equal('Feature');
        expect(payload.features[0].geometry.coordinates).to.deep.equal([
            [77.220259106, 13.152202639, 0],
            [77.220259116, 13.151679372, 0]
        ]);
        expect(payload.features[0].properties).to.deep.include({
            'featureClass': 'NAVLINK'
        });
    });


    it('validate the connect shape point again after submit', async function() {
        await testUtils.events.click(mapContainer, 200, 120);
        let linkshape = (await editorTests.click(editor, 200, 100)).target;

        let lnk = linkshape.getConnectedLinks();

        expect(lnk).to.have.lengthOf(1);
        expect(lnk[0].id).to.equal(link.id);
    });
});
