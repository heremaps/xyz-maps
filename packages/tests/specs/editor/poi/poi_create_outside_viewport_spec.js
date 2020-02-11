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
import dataset from './poi_create_outside_viewport_spec.json';

describe('create a poi outside viewport, it connects to a link nearby', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 78.68822870649961, latitude: 17.065070322770552},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);

        link = preparedData.getFeature('linkLayer', -189171);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('create a poi outside viewport, validate it connects a link nearby', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 78.69697807230585, latitude: 17.06284978426463});
        });

        let p = new features.Place({longitude: 78.68822870649961, latitude: 17.065070322770552}, {featureClass: 'PLACE'});
        let poi = editor.addFeature(p);

        poi.createRoutingPoint();

        expect(poi.prop('routingLink')).to.deep.equal(link.id+'');
    });
});
