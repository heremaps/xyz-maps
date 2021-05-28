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
import {prepare} from 'utils';
import {waitForEditorReady, submit, clean} from 'editorUtils';
import {Editor} from '@here/xyz-maps-editor';
// @ts-ignore @deprecated
import {features} from '@here/xyz-maps-editor';
import {Map} from '@here/xyz-maps-display';
import dataset from './address_delete_new_connected_link_spec.json';

xdescribe('New address connect to a new link and then remove the link', function() {
    // routingPoint and routingLink should be cleared when address's referenced link is removed
    const expect = chai.expect;

    var preparedData;
    var editor;
    var display;

    var link;
    var address;
    var addresssLayer;
    var linkLayer;

    var idMaps = [];

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 72.81168548744967, latitude: 19.44202601424145},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await waitForEditorReady(editor);

        addresssLayer = preparedData.getLayers('paLayer');
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        await clean(editor, idMaps);
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('add link and address and validate its routing point', async function() {
        let addr = new features.Address({x: 400, y: 300}, {featureClass: 'ADDRESS'});
        let lnk = new features.Navlink([{x: 250, y: 100}, {x: 250, y: 400}], {featureClass: 'NAVLINK'});

        link = editor.addFeature(lnk, linkLayer);
        address = editor.addFeature(addr, addresssLayer);

        expect(address.prop('routingPoint')).to.deep.equal([72.81088, 19.44203, 0]);
    });


    it('remove the created link and validate links routingPoint', function() {
        link.remove();

        expect(address.prop('routingPoint')).to.be.equal(null);
        expect(address.prop('routingLink')).to.be.equal(null);
    });


    it('submit the address and validate its routingPoint again', async function() {
        let idMap;

        await waitForEditorReady(editor, async ()=>{
            idMap = await submit(editor);
        });

        idMaps.push(idMap);
        let addressId = idMap.permanentIDMap[address.getProvider().id][address.id];
        let addr = editor.getFeature(addressId, addresssLayer);

        expect(addr.prop('routingPoint')).to.be.undefined;
        expect(addr.prop('routingLink')).to.be.undefined;
    });
});
