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
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './map_history_modify_remove_layer_undo_spec.json';

describe('modify object and remove its layer, then undo the change', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var poiLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.0516688844414, latitude: 18.895885641079214},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        poiLayer = preparedData.getLayers('placeLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('click on POI object', async function() {
        let mapContainer = display.getContainer();
        let p = new features.Place({x: 300, y: 250}, {featureClass: 'PLACE'});
        editor.addFeature(p);

        await testUtils.events.click(mapContainer, 300, 250);

        await testUtils.events.drag(mapContainer, {x: 300, y: 250}, {x: 400, y: 300});


        expect(editor.info()).to.have.lengthOf(1);
        expect(editor.get('history.current')).to.equal(2);
    });


    it('remove poi layer', function() {
        editor.removeLayer(poiLayer);

        expect(editor.info()).to.have.lengthOf(1);
        expect(editor.get('history.current')).to.equal(2);
    });

    it('undo changes', function() {
        editor.undo();
        expect(editor.info()).to.have.lengthOf(1);
        expect(editor.get('history.current')).to.equal(1);
    });

    it('remove poi layer', async function() {
        editor.addLayer(poiLayer);
        expect(editor.info()).to.have.lengthOf(1);
        expect(editor.get('history.current')).to.equal(1);
    });
});
