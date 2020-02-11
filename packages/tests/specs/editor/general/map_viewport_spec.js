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
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './map_viewport_spec.json';

describe('map viewport lock', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.00056, latitude: 13.00109},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
    });

    after(async function() {
        editor.destroy();
        display.destroy();
    });

    it('locked viewport is not draggable', async function() {
        display.lockViewport({pan: true});

        await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});

        expect(display.getCenter()).to.deep.equal({longitude: 76.00056, latitude: 13.00109});
    });

    it('locked viewport is not draggable when drawingboard is active', async function() {
        editor.getDrawingBoard().start();

        await testUtils.events.mousemove(mapContainer, {x: 80, y: 100}, {x: 100, y: 100});

        await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 100, y: 150});

        expect(display.getCenter()).to.deep.equal({longitude: 76.00056, latitude: 13.00109});
    });

    it('create link with drawingboard', async function() {
        await testUtils.events.click(mapContainer, 100, 100);

        // try draging the map
        await testUtils.events.drag(mapContainer, {x: 100, y: 200}, {x: 100, y: 300});

        await testUtils.events.click(mapContainer, 100, 300);

        let lnk;

        await editorTests.waitForEditorReady(editor, ()=>{
            lnk = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        });

        expect(lnk.coord()).to.deep.almost([
            [75.998950675, 13.002135379, 0],
            [75.998950675, 13.00109, 0]
        ]);

        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });
    });


    it('drag map not possible when viewport is locked', async function() {
        await testUtils.events.drag(mapContainer, {x: 100, y: 200}, {x: 100, y: 300});

        expect(display.getCenter()).to.deep.equal({longitude: 76.00056, latitude: 13.00109});
    });


    it('unblock viewport and drag viewport', async function() {
        display.lockViewport({pan: false});

        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 150, y: 150});
        });

        expect(display.getCenter().latitude).to.not.equal( 13.00109);
    });
});
