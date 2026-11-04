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
import {createEditorFixture} from '@test/fixtures/editor';
import {waitForEditorReady} from 'editorUtils';
import {drag, mousemove} from 'triggerEvents';
import {beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import dataset from './viewport-lock.json';

describe('Viewport lock', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 76.00056, latitude: 13.00109},
            zoomlevel: 18
        }));
        mapContainer = display.getContainer();
    });

    it('locked viewport is not draggable', async function() {
        display.lockViewport({pan: true});

        await drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});

        expect(display.getCenter()).toEqual({longitude: 76.00056, latitude: 13.00109});
    });

    it('locked viewport is not draggable when drawingboard is active', async function() {
        display.lockViewport({pan: true});
        editor.getDrawingBoard().start();

        await mousemove(mapContainer, {x: 80, y: 100}, {x: 100, y: 100});

        await drag(mapContainer, {x: 100, y: 100}, {x: 100, y: 150});

        expect(display.getCenter()).toEqual({longitude: 76.00056, latitude: 13.00109});
    });

    it('create link with drawingboard', async function() {
        display.lockViewport({pan: true});
        editor.getDrawingBoard().start();
        await userEvent.click(mapContainer, {position: {x: 100, y: 100}, modifiers: ['Alt']});

        // try draging the map
        await drag(mapContainer, {x: 100, y: 200}, {x: 100, y: 300});

        await userEvent.click(mapContainer, {position: {x: 100, y: 300}, modifiers: ['Alt']});

        let lnk;

        await waitForEditorReady(editor, ()=>{
            lnk = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        });

        expect(lnk.coord()).toEqualWithTolerance([
            [75.998950675, 13.002135379, 0],
            [75.998950675, 13.00109, 0]
        ], 1e-6);

        await waitForEditorReady(editor, ()=>{
            editor.revert();
        });
    });

    it('drag map not possible when viewport is locked', async function() {
        display.lockViewport({pan: true});
        await drag(mapContainer, {x: 100, y: 200}, {x: 100, y: 300});

        expect(display.getCenter()).toEqual({longitude: 76.00056, latitude: 13.00109});
    });

    it('unblock viewport and drag viewport', async function() {
        display.lockViewport({pan: true});
        display.lockViewport({pan: false});

        await waitForEditorReady(editor, async ()=>{
            await drag(mapContainer, {x: 100, y: 100}, {x: 150, y: 150});
        });

        expect(display.getCenter().latitude).not.toBe( 13.00109);
    });
});
