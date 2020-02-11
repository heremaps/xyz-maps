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
import {editorTests, prepare, testUtils} from 'hereTest';
import {features, Editor} from '@here/xyz-maps-editor';
import {Map} from '@here/xyz-maps-core';
import dataset from './address_set_routing_point__and_link_spec.json';

describe('address set routing point and link manually', function() {
    const expect = chai.expect;

    var preparedData;
    var editor;
    var display;

    var address;
    var link1;
    var link2;

    var addrLayer;
    var linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.16847, latitude: 14.150883},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await editorTests.waitForEditorReady(editor);

        link1 = preparedData.getFeature('linkLayer', -188826);
        link2 = preparedData.getFeature('linkLayer', -188827);
        address = preparedData.getFeature('paLayer', -47938);

        addrLayer = preparedData.getLayers('paLayer');
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('validate address', function() {
        expect(address.prop()).to.deep.include({
            'routingLink': link1.id +'',
            'routingPoint': [76.16793, 14.15088, 0]
        });
    });

    it('set routing point and validate', function() {
        address.prop({
            routingLink: link2.id,
            routingPoint: [76.16814, 14.15052, 0]
        });

        expect(address.prop()).to.deep.include({
            'routingLink': link2.id,
            'routingPoint': [76.16814, 14.15052, 0]
        });
    });

    it('undo change and validate routing point again', async function() {
        editor.undo();

        let addr = editor.getFeature(address.id, addrLayer);
        let link = editor.getFeature(link1.id, linkLayer);

        expect(addr.prop()).to.deep.include({
            'routingLink': link.id +'',
            'routingPoint': [76.16793, 14.15088, 0]
        });
    });
});
