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
import {editorTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './address_autoconnect_spec.json';

describe('address routing point connects to links automatically', function() {
    const expect = chai.expect;

    let preparedData;
    let editor;
    let display;
    let mapContainer;
    let link1; let link2; let address;

    before(async function() {
        preparedData = await prepare(dataset);

        display = new Map(document.getElementById('map'), {
            center: {longitude: 74.811511, latitude: 12.976344},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -10);
        link2 = preparedData.getFeature('linkLayer', -189702);
        address = preparedData.getFeature('paLayer', -47932);
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('get an Address object which connects to a link', async function() {
        let props = address.prop();

        expect(props.routingLink).to.equal(link1.id);
        expect(props).to.deep.include({'routingPoint': [74.81124, 12.97608, 0]});
    });

    it('select the address object, drag its routing point and validate', async function() {
        address.select();

        // drag routing point of address
        await testUtils.events.drag(mapContainer, {x: 300, y: 400}, {x: 400, y: 500});

        var props = address.prop();
        expect(props.routingLink).to.equal(link1.id + '');
        expect(props).to.deep.include({'routingPoint': [74.81151, 12.97608, 0]});

        // drag routing point of address
        await testUtils.events.drag(mapContainer, {x: 400, y: 400}, {x: 420, y: 370});

        var props = address.prop();
        expect(props.routingLink).to.equal(link2.id + '');
        expect(props).to.deep.include({'routingPoint': [74.81158, 12.97615, 0]});

        address.unselect();
    });
});
