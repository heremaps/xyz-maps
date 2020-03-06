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
import {MonitorXHR, prepare} from 'testUtils';
import {waitForEditorReady, submit} from 'editorTests';
import {features, Editor} from '@here/xyz-maps-editor';
import {Map} from '@here/xyz-maps-core';
import chaiAlmost from 'chai-almost';
import dataset from './address_create_remove_spec.json';

describe('add Address object and then remove', function() {
    const expect = chai.expect;

    var preparedData;
    var editor;
    var display;

    var link;
    var address;
    var paLayer;

    before(async function() {
        chai.use(chaiAlmost(1e-7));
        preparedData = await prepare(dataset);

        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.32831, latitude: 12.9356},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await waitForEditorReady(editor);

        link = preparedData.getFeature('linkLayer', -188807);
        paLayer = preparedData.getLayers('paLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate add an address object and submit', async function() {
        let idMap;
        let addr = new features.Address({x: 200, y: 300}, {featureClass: 'ADDRESS'});
        address = editor.addFeature(addr, paLayer);

        editor.undo();
        editor.redo();

        let monitor = new MonitorXHR();
        monitor.start({method: 'post'});
        await waitForEditorReady(editor, async ()=>{
            idMap = await submit(editor);
        });
        let addressId = idMap.permanentIDMap[address.getProvider().id][address.id];
        let reqs = monitor.stop();
        expect(reqs).to.have.lengthOf(1);

        let payloadAddress = reqs[0].payload;
        expect(payloadAddress.features[0].geometry.coordinates).to.deep.almost([77.327237116, 12.9356, 0]);
        expect(payloadAddress.features[0].geometry.type).to.equal('Point');
        expect(payloadAddress.features[0].properties).to.deep.include({
            'featureClass': 'ADDRESS',
            'routingLink': link.id + '',
            'routingPoint': [77.32724, 12.93586, 0]
        });
    });


    it('validate remove address and submit', async function() {
        address = editor.search({layers: [paLayer], rect: display.getViewBounds()})[0];

        address.remove();
        expect(address.prop('removed')).to.be.equal('HOOK');
        expect(address.prop('estate')).to.be.equal('REMOVED');

        let monitor = new MonitorXHR(RegExp(/&id=/));
        monitor.start({method: 'delete'});
        await waitForEditorReady(editor, async ()=>{
            await submit(editor);
        });
        let request = monitor.stop()[0];

        expect(request.payload).to.equal(null);
        expect(request.method).to.equal('DELETE');
        expect(request.url.indexOf(address.id)>-1).to.be.true;
    });
});
