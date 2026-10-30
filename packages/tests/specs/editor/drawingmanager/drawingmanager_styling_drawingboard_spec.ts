/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './drawingmanager_styling_drawingboard_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Styling drawingboard', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 77.126032, latitude: 12.758817},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        mapContainer = display.getContainer();
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
    });

    it('start drawingmanager', function() {
        editor.getDrawingBoard().start();
        expect(editor.getDrawingBoard().isActive()).toBe(true);
    });

    it('add shape point and validate drawingboard features in editor overlay', async function() {
        let layer = editor.getOverlay();

        await mousemove(mapContainer, {x: 100, y: 80}, {x: 100, y: 100});
        await click(mapContainer, 100, 100);

        let features = layer.search(display.getViewBounds());
        // 3 features: link, link shape and floating shape below mouse
        expect(features).toHaveLength(3);

        // validate position of link shape and floating shape below mouse
        features.forEach((feature)=>{
            if (feature.geometry.type == 'Point') {
                expect(feature.geometry.coordinates).toEqualWithTolerance([77.124422675, 12.75986339, 0], 1e-6);
            }
        });

        await mousemove(mapContainer, {x: 100, y: 280}, {x: 100, y: 300});
        await click(mapContainer, 100, 300);

        features = layer.search(display.getViewBounds());
        // 4 features: link, 2 link shapes and float shape below mouse
        expect(features).toHaveLength(4);

        // check position of added first link shape points
        features = layer.search({point: {longitude: 77.124422675, latitude: 12.75986339}, radius: 5});
        features.forEach((feature)=>{
            if (feature.geometry.type == 'Point') {
                expect(feature.geometry.coordinates).toEqualWithTolerance([77.124422675, 12.75986339, 0], 1e-6);
            }
        });

        // check position of added second link shape points and floating shape below mouse
        features = layer.search({point: {longitude: 77.124422675, latitude: 12.758817}, radius: 5});
        features.forEach((feature)=>{
            if (feature.geometry.type == 'Point') {
                expect(feature.geometry.coordinates).toEqualWithTolerance([77.124422675, 12.758817, 0], 1e-6);
            }
        });

        expect(editor.getDrawingBoard().getLength()).toBe(2);
    });

    it('finish drawing the link and validate new link is created', function() {
        link = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        link.prop('type', 'path');

        expect(link.prop('type')).toBe('path');
    });


    it('start drawingmanager again with custom style', function() {
        editor.getDrawingBoard().start({
            styleGroup: [
                {zIndex: 0, type: 'Line', stroke: '#AA84A4', strokeWidth: 24},
                {zIndex: 1, type: 'Line', stroke: '#C799E8', strokeWidth: 10},
                {zIndex: 2, type: 'Rect', width: 20, height: 20, fill: '#2233ee'},
                {zIndex: 3, type: 'Circle', radius: 5, fill: '#ee9922'}
            ]
        });
        expect(editor.getDrawingBoard().isActive()).toBe(true);
    });

    it('add shape point and validate new style of drawingboard', async function() {
        await mousemove(mapContainer, {x: 200, y: 80}, {x: 200, y: 100});
        await click(mapContainer, 200, 100);

        await mousemove(mapContainer, {x: 200, y: 280}, {x: 200, y: 300});
        await click(mapContainer, 200, 300);

        expect(editor.getDrawingBoard().getLength()).toBe(2);

        let colors = await getCanvasPixelColor(mapContainer, [{x: 200, y: 100}, {x: 208, y: 108}, {x: 200, y: 250}, {x: 208, y: 250}], {
            expect: ['#ee9922', '#2233ee', '#c799e8', '#aa84a4']
        });

        expect(colors[0]).toBe('#ee9922');
        expect(colors[1]).toBe('#2233ee');
        expect(colors[2]).toBe('#c799e8');
        expect(colors[3]).toBe('#aa84a4');
    });

    it('finish drawing the link and validate link is created', function() {
        link = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        link.prop('type', 'path');

        expect(link.prop('type')).toBe('path');
    });
});
