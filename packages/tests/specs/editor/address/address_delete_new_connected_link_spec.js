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
import {editorTests, prepare} from 'hereTest';
import {features, Editor} from '@here/xyz-maps-editor';
import {Map} from '@here/xyz-maps-core';
import dataset from './address_delete_new_connected_link_spec.json';

xdescribe('New address connect to a new link and then remove the link', function() {
    const expect = chai.expect;

    var preparedData;
    var editor;
    var display;

    var link;
    var address;

    var idMaps = [];

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 72.81168548744967, latitude: 19.44202601424145},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});
    });

    after(async function() {
        await editorTests.clean(editor, idMaps);
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('add link and address and validate its routing point', async function() {
        let addr = new features.Address({x: 400, y: 300}, {featureClass: 'ADDRESS'});
        let lnk = new features.Navlink([{x: 250, y: 100}, {x: 250, y: 400}], {featureClass: 'NAVLINK'});

        link = editor.addFeature(lnk);
        address = editor.addFeature(addr);

        expect(address.prop('routingPoint')).to.deep.equal([74.81151, 12.92608, 0]);
    });


    it('remove the created link and validate links routingPoint', function() {
        link.remove();

        expect(address.prop('routingPoint')).to.deep.equal([72.81064, 19.44203, 0]);
        expect(address.prop('routingLink')).to.equal('897474422');
    });


    it('submit the address and validate its routingPoint again', async function() {
        let idMap;

        await editorTests.waitForEditorReady(editor, async ()=>{
            idMap = await editorTests.submit(editor);
        });

        idMaps.push(idMap);
        let addressId = idMap.permanentIDMap[address.getProvider().id][address.id];
        let addr = editor.getFeature(addressId, address.getProvider().src);

        expect(addr.prop('routingPoint')).to.deep.equal([72.81064, 19.44203, 0]);
        expect(addr.prop('routingLink')).to.equal('897474422');

        addr.remove();
        await editorTests.waitForEditorReady(editor, async ()=>{
            await editorTests.submit(editor);
        });
    });
});
