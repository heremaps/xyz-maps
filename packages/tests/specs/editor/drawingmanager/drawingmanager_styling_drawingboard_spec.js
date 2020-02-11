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
import dataset from './drawingmanager_styling_drawingboard_spec.json';

describe('Styling drawingboard', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 77.126032, latitude: 12.758817},
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

    it('start drawingmanager', function() {
        editor.getDrawingBoard().start();
        expect(editor.getDrawingBoard().isActive()).to.be.true;
    });

    it('add shape point and validate drawingboard features in editor overlay', async function() {
        let layer = editor.getOverlay();

        await testUtils.events.mousemove(mapContainer, {x: 100, y: 80}, {x: 100, y: 100});
        await testUtils.events.click(mapContainer, 100, 100);

        let features = layer.search(display.getViewBounds());
        // 3 features: link, link shape and float shape below mouse
        expect(features).to.have.lengthOf(3);

        await testUtils.events.mousemove(mapContainer, {x: 100, y: 280}, {x: 100, y: 300});
        await testUtils.events.click(mapContainer, 100, 300);

        let features = layer.search(display.getViewBounds());
        // 4 features: link, 2 link shapes and float shape below mouse
        expect(features).to.have.lengthOf(4);

        expect(editor.getDrawingBoard().getLength()).to.be.equal(2);
    });

    it('finish drawing the link and validate new link is created', function() {
        link = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        link.prop('type', 'path');

        expect(link.prop('type')).to.equal('path');
    });


    it('start drawingmanager again with custom style', function() {
        editor.getDrawingBoard().start({
            styleGroup: [
                {zIndex: 0, type: 'Line', stroke: '#AA84A4', strokeWidth: 18},
                {zIndex: 1, type: 'Line', stroke: '#C799E8', strokeWidth: 10},
                {zIndex: 2, type: 'Rect', width: 14, height: 14, fill: '#2233ee'},
                {zIndex: 3, type: 'Circle', radius: 5, fill: '#ee9922'}
            ]
        });
        expect(editor.getDrawingBoard().isActive()).to.be.true;
    });

    it('add shape point and validate new style of drawingboard', async function() {
        await testUtils.events.mousemove(mapContainer, {x: 200, y: 80}, {x: 200, y: 100});
        await testUtils.events.click(mapContainer, 200, 100);

        await testUtils.events.mousemove(mapContainer, {x: 200, y: 280}, {x: 200, y: 300});
        await testUtils.events.click(mapContainer, 200, 300);

        expect(editor.getDrawingBoard().getLength()).to.be.equal(2);

        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 200, 100);
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 206, 106);
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 200, 200);
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 207, 200);

                expect(color1).to.equal('#ee9922');
                expect(color2).to.equal('#2233ee');
                expect(color3).to.equal('#c799e8');
                expect(color4).to.equal('#aa84a4');
                resolve();
            }, 100);
        });
    });

    it('finish drawing the link and validate link is created', function() {
        link = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        link.prop('type', 'path');

        expect(link.prop('type')).to.equal('path');
    });
});
