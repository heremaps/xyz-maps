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
import {Editor} from '@here/xyz-maps-editor';
import {Map} from '@here/xyz-maps-core';
import dataset from './address_get_functions_spec.json';

describe('Address get functions', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;
    var link;
    var address;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.26398409, latitude: 19.20905288},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await editorTests.waitForEditorReady(editor);

        link = preparedData.getFeature('linkLayer', -188821);
        address = preparedData.getFeature('paLayer', -47935);
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('get correct geoCoordinates, pixel coordinate', async function() {
        expect(address.coord()).to.deep.equal([73.262911206, 19.210066027, 0]);
        expect(address.prop()).to.deep.include({
            'routingLink': link.id,
            'routingPoint': [73.26291, 19.20981, 0],
            'housenumber': '180a',
            'roadname': 'test street'
        });
        expect(address.getLink()).to.deep.include({
            'id': link.id
        });
    });
});
