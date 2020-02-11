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
import dataset from './poi_get_functions_spec.json';

describe('Place get functions', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;
    var link;
    var poi;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.29398409, latitude: 19.27905288},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await editorTests.waitForEditorReady(editor);

        poi = preparedData.getFeature('placeLayer', -48135);
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('get correct geoCoordinates, properties', async function() {
        expect(poi.coord()).to.deep.equal([73.29398409, 19.27905288, 0]);
        expect(poi.prop()).to.deep.include({
            routingPoint: [78.26291, 19.20981, 0],
            routingLink: '-178821',
            name: 'test hotel',
            type: 'hotel'
        });
    });
});
