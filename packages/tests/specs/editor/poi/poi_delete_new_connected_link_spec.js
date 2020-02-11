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
import dataset from './poi_delete_new_connected_link_spec.json';

describe('New poi connect to a new link and then remove the link', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var link; var poi;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 78.34913, latitude: 17.31552},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);

        link = preparedData.getFeature('linkLayer', -189172);
        poi = preparedData.getFeature('placeLayer', -29531);

        poi.createRoutingPoint();
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate routingPoint value of poi', function() {
        expect(poi.prop('routingPoint')).to.deep.equal([78.34833, 17.31552, 0]);
    });

    xit('remove link and validate again', async function() {
        link.remove();

        expect(poi.prop().routingLink).to.equal(null);
        expect(poi.prop().routingPoint).to.equal(null);
    });


    xit('submit created objects and validate again', async function() {
        let idMap;

        await editorTests.waitForEditorReady(editor, async ()=>{
            idMap = await editorTests.submit(editor);
        });

        let poiId = idMap.permanentIDMap[poi.getProvider().id][poi.id];

        let p = editor.getFeature(poiId, poi.getProvider().src);

        expect(p.prop().routingLink).to.equal(null);
        expect(p.prop().routingPoint).to.equal(null);
    });
});
