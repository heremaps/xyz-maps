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
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './address_create_outofview_spec.json';

describe('add Address object and submit out of viewport', function() {
    const expect = chai.expect;

    let preparedData;
    let address;
    let link;

    let editor;
    let display;
    let idMap;
    let linkLayer;
    let paLayer;

    before(async function() {
        preparedData = await prepare(dataset);

        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.51762421180752, latitude: 12.462893472900575},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await editorTests.waitForEditorReady(editor);

        linkLayer = preparedData.getLayers('linkLayer');
        paLayer = preparedData.getLayers('paLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('add a link and address object', async function() {
        // add a link and address object
        let addr = new features.Address({x: 100, y: 300}, {featureClass: 'ADDRESS'});
        let lk = new features.Navlink([{x: 250, y: 400}, {x: 400, y: 400}], {featureClass: 'NAVLINK'});

        link = editor.addFeature(lk, linkLayer);
        address = editor.addFeature(addr, paLayer);

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(2);

        let mapContainer = display.getContainer();
        // drag map
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 300, y: 400}, {x: 350, y: 450});
        });

        editor.undo();
        editor.redo();

        let monitor = new testUtils.MonitorXHR();

        await editorTests.waitForEditorReady(editor, async ()=>{
            idMap = await editorTests.submit(editor);
        });

        let linkId = idMap.permanentIDMap[link.getProvider().id][link.id];
        let reqs = monitor.stop({method: 'post'});
        let payloadAddress;
        expect(reqs).to.have.lengthOf(2);

        if (reqs[0].url.indexOf(paLayer.getProvider().space) > 0) {
            payloadAddress = reqs[0].payload;
        } else {
            payloadAddress = reqs[1].payload;
        }

        link = editor.getFeature(linkId, linkLayer);

        payloadAddress.features.forEach(function(p, i) {
            expect(p.geometry).to.deep.equal({
                'coordinates': [76.516014886, 12.462893473, 0],
                'type': 'Point'
            });
            expect(p.type).to.equal('Feature');

            expect(p.properties).to.deep.include({
                'featureClass': 'ADDRESS',
                'routingLink': link.id + '',
                'routingPoint': [76.51682, 12.46237, 0]
            });
        });
    });

    it('move map and then remove the address object and submit', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 76.51452894260433, latitude: 12.463857265087213});
        });

        // remove address
        let objs = editor.search({rect: display.getViewBounds()});

        objs.forEach((o) => {
            o.remove();
        });

        let monitor = new testUtils.MonitorXHR(/&id=/);

        await editorTests.waitForEditorReady(editor, async ()=>{
            await editorTests.submit(editor);
        });
        let request = monitor.stop({method: 'delete'})[0];

        expect(request.payload).to.equal(null);
        expect(request.method).to.equal('DELETE');
        expect(request.url.indexOf(objs[0].id)>-1).to.be.true;
    });
});

