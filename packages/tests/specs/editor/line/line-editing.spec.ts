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
import {DrawingShape, Line} from '@here/xyz-maps-editor';
import {createEditorFixture, editorClick} from 'editorUtils';
import {drag, mousemove} from 'triggerEvents';
import {beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import dataset from './line-editing.json';

describe('Line editing', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let line;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 76.08312571088209, latitude: 13.214838342327566},
            zoomlevel: 18
        }));

        mapContainer = display.getContainer();
    });

    it('edits line shapes, changes coordinates and removes the line', async () => {
        // create line by drawing manager
        {
            editor.getDrawingBoard().start({mode: 'Line'});

            await mousemove(mapContainer, {x: 100, y: 100}, {x: 100, y: 200});
            await userEvent.click(mapContainer, {position: {x: 100, y: 200}, modifiers: ['Alt']});

            await mousemove(mapContainer, {x: 200, y: 100}, {x: 200, y: 100});
            await userEvent.click(mapContainer, {position: {x: 200, y: 100}, modifiers: ['Alt']});

            await mousemove(mapContainer, {x: 200, y: 100}, {x: 300, y: 200});
            await userEvent.click(mapContainer, {position: {x: 300, y: 200}, modifiers: ['Alt']});

            let point = <DrawingShape>(await editorClick(editor, 200, 100)).target;
            point.remove();

            await mousemove(mapContainer, {x: 200, y: 100}, {x: 200, y: 300});
            await userEvent.click(mapContainer, {position: {x: 200, y: 300}, modifiers: ['Alt']});

            await drag(mapContainer, {x: 100, y: 200}, {x: 400, y: 300});

            let shape = <DrawingShape>(await editorClick(editor, 400, 300)).target;

            expect(shape.getIndex()).toBe(0);
            expect(shape.getLength()).toBe(3);

            line = editor.getDrawingBoard().create({featureClass: 'LINE'});
        }

        // validate line geometry
        {
            let selected = <Line>(await editorClick(editor, 400, 300)).target;
            expect(selected.coord()).toEqualWithTolerance([
                [76.083125712, 13.214838342, 0],
                [76.082589269, 13.215360578, 0],
                [76.082052827, 13.214838342, 0]
            ], 1e-6);
        }

        // modify geometry by dragging shape
        {
            await drag(mapContainer, {x: 400, y: 300}, {x: 300, y: 400});

            expect(line.coord()).toEqualWithTolerance([
                [76.082589270, 13.214316105, 0],
                [76.082589269, 13.215360578, 0],
                [76.082052827, 13.214838342, 0]
            ], 1e-6);
        }

        // remove shape
        {
            let shape = <DrawingShape>(await editorClick(editor, 300, 400)).target;

            shape.remove();

            expect(line.coord()).toEqualWithTolerance([
                [76.082589269, 13.215360578, 0],
                [76.082052827, 13.214838342, 0]
            ], 1e-6);
        }

        // modify geometry by dragging virtual shape
        {
            line.select();

            await drag(mapContainer, {x: 250, y: 250}, {x: 350, y: 350});

            expect(line.coord()).toEqualWithTolerance([
                [76.082589269, 13.215360578, 0],
                [76.082857490, 13.214577223, 0],
                [76.082052827, 13.214838342, 0]
            ], 1e-6);
        }

        // remove line
        {
            let {id} = line;
            let feature = editor.search({id: id}).pop();

            feature.remove();

            let result = editor.search({id: id});

            expect(result.length).toBe(0);
        }
    });

    // 1204.25 366.7
});
