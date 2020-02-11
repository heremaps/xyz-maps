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
import dataset from './address_create_outside_viewport_spec.json';

describe('create an address outside viewport, it connects to a link nearby', function() {
    const expect = chai.expect;

    let preparedData;
    let link;
    let address;
    let editor;
    let display;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.55616842610328, latitude: 14.022611963396827},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await editorTests.waitForEditorReady(editor);
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('create an address outside viewport and valiate', async function() {
        // add a link to map
        let l = new features.Navlink([{x: 100, y: 300}, {x: 400, y: 300}], {featureClass: 'NAVLINK'});
        link = editor.addFeature(l);

        await editorTests.waitForEditorReady(editor, ()=>{
            // move map to a new area
            display.setCenter({longitude: 78.89367980171193, latitude: 16.123231585461355});
        });

        // add an address to map
        let addr = new features.Address({longitude: 75.55616842610328, latitude: 14.022611963396827}, {featureClass: 'ADDRESS'});
        address = editor.addFeature(addr);

        // validate address connects to correct link
        expect(address.prop()).to.deep.include({
            routingLink: link.id,
            routingPoint: [75.55617, 14.02261, 0]
        });
    });
});


