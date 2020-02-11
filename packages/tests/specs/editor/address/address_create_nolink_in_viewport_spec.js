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
import {Map} from '@here/xyz-maps-core';
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './address_create_nolink_in_viewport_spec.json';

describe('create an address where no link exists within 1000 meters', function() {
    const expect = chai.expect;

    var preparedData;
    var addrLayer;
    var editor;
    var display;

    before(async function() {
        preparedData = await prepare(dataset);

        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.2627802276752, latitude: 15.212266301808356},
            zoomLevel: 14,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await editorTests.waitForEditorReady(editor);

        addrLayer = preparedData.getLayers('paLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('add two address and validate', async function() {
        // add one address which should fail as no link exists within 1000 meters
        let addr1 = new features.Address({x: 200, y: 300}, {featureClass: 'ADDRESS'});
        editor.addFeature(addr1);

        // add one more address
        let addr2 = new features.Address({x: 50, y: 300}, {featureClass: 'ADDRESS'});
        editor.addFeature(addr2);

        let objs = editor.search({rect: display.getViewBounds(), layers: [addrLayer]});
        expect(objs).to.have.lengthOf(1);
    });
});
