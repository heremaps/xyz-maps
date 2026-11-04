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
import {DrawingShape, Line, LineShape} from '@here/xyz-maps-editor';
import {createEditorFixture, editorClick} from 'editorUtils';
import {drag} from 'triggerEvents';
import {beforeEach, describe, expect, it} from 'vitest';
import dataset from './multiline-editing.json';

describe('Multiline editing', () => {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let multiLine;

    beforeEach(async () => {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 76.08312571088209, latitude: 13.214838342327566},
            zoomlevel: 18
        }));

        mapContainer = display.getContainer();

        multiLine = preparedData.getFeature('lineLayer', 'LINE');
    });

    it('edits multiline shapes and component line strings through the full workflow', async () => {
        // validate geometry type
        {
            expect(multiLine.geometry.type).toBe('MultiLineString');
        }

        // validate pointerevents
        {
            const target = <Line>(await editorClick(editor, 400, 300)).target;

            expect(multiLine).toBe(target);
        }

        // validate line geometry
        {
            const coordinates = multiLine.coord();

            expect(coordinates.length).toBe(1);

            expect(coordinates[0]).toEqualWithTolerance([
                [76.083125712, 13.214838342, 0],
                [76.082589269, 13.215360578, 0],
                [76.082052827, 13.214838342, 0]
            ], 1e-6);
        }

        // modify geometry by dragging shape
        {
            await drag(mapContainer, {x: 400, y: 300}, {x: 300, y: 400});

            const coordinates = multiLine.coord();
            expect(coordinates.length).toBe(1);

            expect(coordinates[0]).toEqualWithTolerance([
                [76.082589270, 13.214316105, 0],
                [76.082589269, 13.215360578, 0],
                [76.082052827, 13.214838342, 0]
            ], 1e-6);
        }

        // remove shape
        {
            const shape = <DrawingShape>(await editorClick(editor, 300, 400)).target;

            shape.remove();

            const coordinates = multiLine.coord();
            expect(coordinates.length).toBe(1);

            expect(coordinates[0]).toEqualWithTolerance([
                [76.082589269, 13.215360578, 0],
                [76.082052827, 13.214838342, 0]
            ], 1e-6);
        }

        // modify geometry by dragging virtual shape
        {
            multiLine.select();

            await drag(mapContainer, {x: 250, y: 250}, {x: 350, y: 350});

            const coordinates = multiLine.coord();
            expect(coordinates.length).toBe(1);

            expect(coordinates[0]).toEqualWithTolerance([
                [76.082589269, 13.215360578, 0],
                [76.082857490, 13.214577223, 0],
                [76.082052827, 13.214838342, 0]
            ], 1e-6);
        }

        // add linestring geometry
        {
            let coordinates = multiLine.coord();

            coordinates.push([
                [76.082589269, 13.2155, 0],
                [76.081157490, 13.2146, 0],
                [76.082052827, 13.2149, 0]
            ]);

            multiLine.coord(coordinates);

            coordinates = multiLine.coord();

            expect(coordinates.length).toBe(2);

            expect(coordinates).toEqualWithTolerance([[
                [76.082589269, 13.215360578, 0],
                [76.082857490, 13.214577223, 0],
                [76.082052827, 13.214838342, 0]
            ], [
                [76.082589269, 13.2155, 0],
                [76.081157490, 13.2146, 0],
                [76.082052827, 13.2149, 0]
            ]], 1e-6);
        }

        // validate pointer events
        {
            const {target} = (await editorClick(editor, 200, 240));

            expect(multiLine).toBe(target);
        }

        // add Shape to first linestring
        {
            multiLine.addShape({x: 200, y: 300});

            let coordinates = multiLine.coord();

            expect(coordinates).toEqualWithTolerance([[
                [76.082589269, 13.215360578, 0],
                [76.082857490, 13.214577223, 0],
                [76.082052827, 13.214838342, 0],
                [76.082052827, 13.214838342, 0]
            ], [
                [76.082589269, 13.2155, 0],
                [76.081157490, 13.2146, 0],
                [76.082052827, 13.2149, 0]
            ]], 1e-6);
        }

        // add Shape to second linestring
        {
            multiLine.addShape({x: 200, y: 100}, 1);

            let coordinates = multiLine.coord();

            expect(coordinates).toEqualWithTolerance([[
                [76.082589269, 13.215360578, 0],
                [76.082857490, 13.214577223, 0],
                [76.082052827, 13.214838342, 0],
                [76.082052827, 13.214838342, 0]
            ], [
                [76.082589269, 13.2155, 0],
                [76.082052827, 13.2158828, 0],
                [76.081157490, 13.2146, 0],
                [76.082052827, 13.2149, 0]
            ]], 1e-6);
        }

        // remove shape of LineString 1
        {
            const target = <LineShape>(await editorClick(editor, 200, 300)).target;

            target.remove();

            let coordinates = multiLine.coord();

            expect(coordinates).toEqualWithTolerance([[
                [76.082589269, 13.215360578, 0],
                [76.082857490, 13.214577223, 0],
                [76.082052827, 13.214838342, 0]
            ], [
                [76.082589269, 13.2155, 0],
                [76.082052827, 13.2158828, 0],
                [76.081157490, 13.2146, 0],
                [76.082052827, 13.2149, 0]
            ]], 1e-6);
        }

        // remove shape of LineString 2
        {
            const target = <LineShape>(await editorClick(editor, 200, 100)).target;

            target.remove();

            let coordinates = multiLine.coord();

            expect(coordinates).toEqualWithTolerance([[
                [76.082589269, 13.215360578, 0],
                [76.082857490, 13.214577223, 0],
                [76.082052827, 13.214838342, 0]
            ], [
                [76.082589269, 13.2155, 0],
                [76.081157490, 13.2146, 0],
                [76.082052827, 13.2149, 0]
            ]], 1e-6);
        }

        // remove multiline
        {
            const {id} = multiLine;
            const feature = editor.search({id}).pop();

            feature.remove();

            const result = editor.search({id});

            expect(result.length).toBe(0);
        }
    });
});
