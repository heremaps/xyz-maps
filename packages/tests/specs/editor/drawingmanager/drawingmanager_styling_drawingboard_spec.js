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
import {getCanvasPixelColor, prepare} from 'utils';
import {waitForEditorReady} from 'editorUtils';
import {click, mousemove} from 'triggerEvents';
import {Map} from '@here/xyz-maps-core';
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './drawingmanager_styling_drawingboard_spec.json';

describe('Styling drawingboard', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    before(async function() {
        chai.use(chaiAlmost());
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
        await waitForEditorReady(editor);
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

        await mousemove(mapContainer, {x: 100, y: 80}, {x: 100, y: 100});
        await click(mapContainer, 100, 100);

        let features = layer.search(display.getViewBounds());
        // 3 features: link, link shape and floating shape below mouse
        expect(features).to.have.lengthOf(3);

        // validate position of link shape and floating shape below mouse
        features.forEach((feature)=>{
            if (feature.geometry.type == 'Point') {
                expect(feature.geometry.coordinates).to.deep.almost([77.124422675, 12.75986339, 0]);
            }
        });

        await mousemove(mapContainer, {x: 100, y: 280}, {x: 100, y: 300});
        await click(mapContainer, 100, 300);

        features = layer.search(display.getViewBounds());
        // 4 features: link, 2 link shapes and float shape below mouse
        expect(features).to.have.lengthOf(4);

        // check position of added first link shape points
        features = layer.search({point: {longitude: 77.124422675, latitude: 12.75986339}, radius: 5});
        features.forEach((feature)=>{
            if (feature.geometry.type == 'Point') {
                expect(feature.geometry.coordinates).to.deep.almost([77.124422675, 12.75986339, 0]);
            }
        });

        // check position of added second link shape points and floating shape below mouse
        features = layer.search({point: {longitude: 77.124422675, latitude: 12.758817}, radius: 5});
        features.forEach((feature)=>{
            if (feature.geometry.type == 'Point') {
                expect(feature.geometry.coordinates).to.deep.almost([77.124422675, 12.758817, 0]);
            }
        });

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
        await mousemove(mapContainer, {x: 200, y: 80}, {x: 200, y: 100});
        await click(mapContainer, 200, 100);

        await mousemove(mapContainer, {x: 200, y: 280}, {x: 200, y: 300});
        await click(mapContainer, 200, 300);

        expect(editor.getDrawingBoard().getLength()).to.be.equal(2);

        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = getCanvasPixelColor(mapContainer, 200, 100);
                let color2 = getCanvasPixelColor(mapContainer, 206, 106);
                let color3 = getCanvasPixelColor(mapContainer, 200, 200);
                let color4 = getCanvasPixelColor(mapContainer, 207, 200);

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
