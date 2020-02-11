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
import {editorTests, displayTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './map_click_spec.json';

describe('map click on ground and link', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.0572959685897, latitude: 13.08281747103834},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
    });


    it('listen to events and validate', async function() {
        let listener = new testUtils.Listener(editor, ['pointerup', 'dragStart', 'dragStop']);

        let mapContainer = display.getContainer();
        // click on ground
        await testUtils.events.click(mapContainer, 200, 170);

        // drag map
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 300, y: 100});
        });

        // drag map again
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 350, y: 100}, {x: 150, y: 100});
        });

        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 76.05532722717277, latitude: 13.084839606874539});
        });


        let lnk = new features.Navlink([{x: 100, y: 100}, {x: 300, y: 100}], {featureClass: 'NAVLINK'});
        let link = editor.addFeature(lnk);

        // click on a link
        await testUtils.events.click(mapContainer, 160, 100);

        let results = listener.stop();

        expect(results.dragStart).to.have.lengthOf(0);
        expect(results.dragStop).to.have.lengthOf(0);
        expect(results.pointerup).to.have.lengthOf(2);

        expect(results.pointerup[0]).to.deep.include({
            mapX: 200,
            mapY: 170
        });
        expect(results.pointerup[1]).to.deep.include({
            mapX: 160,
            mapY: 100
        });
    });
});
