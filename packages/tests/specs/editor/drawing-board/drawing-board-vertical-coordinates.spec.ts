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
import {prepare} from 'utils';
import {waitForEditorReady} from 'editorUtils';
import {mousemove} from 'triggerEvents';
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './drawing-board-vertical-coordinates.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Drawing board vertical coordinates', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.9860738750076, latitude: 12.891802202549211},
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


    it('start drawingmanager', async function() {
        editor.getDrawingBoard().start();

        expect(editor.getDrawingBoard().isActive()).toBe(true);

        await mousemove(mapContainer, {x: 150, y: 200}, {x: 200, y: 200});
        await userEvent.click(mapContainer, {position: {x: 200, y: 200}, modifiers: ['Alt']});

        await mousemove(mapContainer, {x: 200, y: 200}, {x: 300, y: 150});
        await userEvent.click(mapContainer, {position: {x: 300, y: 150}, modifiers: ['Alt']});

        await mousemove(mapContainer, {x: 200, y: 200}, {x: 300, y: 150});
        await userEvent.click(mapContainer, {position: {x: 300, y: 150}, modifiers: ['Alt']});

        await mousemove(mapContainer, {x: 300, y: 150}, {x: 200, y: 100});
        await userEvent.click(mapContainer, {position: {x: 200, y: 100}, modifiers: ['Alt']});

        await mousemove(mapContainer, {x: 200, y: 150}, {x: 300, y: 200});
        await userEvent.click(mapContainer, {position: {x: 300, y: 200}, modifiers: ['Alt']});

        link = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});

        expect(link.coord()).toHaveLength(4);
    });


    it('revert changes and start again, draw link with start and end shape point with same longitude', async function() {
        // link should have 4 shape points but not a vertical link with 2 shape points
        await waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        editor.getDrawingBoard().start();

        // start shape point
        await mousemove(mapContainer, {x: 150, y: 200}, {x: 200, y: 200});
        await userEvent.click(mapContainer, {position: {x: 200, y: 200}, modifiers: ['Alt']});

        await mousemove(mapContainer, {x: 200, y: 200}, {x: 300, y: 150});
        await userEvent.click(mapContainer, {position: {x: 300, y: 150}, modifiers: ['Alt']});

        await mousemove(mapContainer, {x: 300, y: 150}, {x: 200, y: 100});
        await userEvent.click(mapContainer, {position: {x: 200, y: 100}, modifiers: ['Alt']});

        // end shape point, it has the same longtitude as the start shape point
        await mousemove(mapContainer, {x: 200, y: 150}, {x: 200, y: 300});
        await userEvent.click(mapContainer, {position: {x: 200, y: 300}, modifiers: ['Alt']});

        link = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});

        expect(link.coord()).toHaveLength(4);
    });
});
