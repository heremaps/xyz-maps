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
import {beforeEach, describe, expect, it} from 'vitest';
import dataset from './history-boundaries.json';

describe('History boundaries', function() {
    var editor;
    var display;
    var preparedData;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 76.089289, latitude: 13.010477},
            zoomlevel: 18
        }));
    });

    it('keeps repeated undo and redo at the history boundaries', async () => {
        // add a link object
        {
            let l = {
                type: 'Feature',
                properties: {featureClass: 'NAVLINK'},
                geometry: {
                    type: 'LineString',
                    coordinates: editor.toGeoJSONCoordinates([{x: 110, y: 110}, {x: 120, y: 210}])
                }
            };
            let link = editor.addFeature(l);

            expect(editor.get('history.current')).toBe(1);
            expect(editor.get('history.length')).toBe(1);
            expect(editor.get('changes.length')).toBe(1);
        }
        // undo changes
        {
            editor.undo();

            expect(editor.get('history.current')).toBe(0);
            expect(editor.get('history.length')).toBe(1);
            expect(editor.get('changes.length')).toBe(0);
        }
        // undo changes once again
        {
            editor.undo();

            expect(editor.get('history.current')).toBe(0);
            expect(editor.get('history.length')).toBe(1);
            expect(editor.get('changes.length')).toBe(0);
        }
        // undo one more time
        {
            editor.undo();

            expect(editor.get('history.current')).toBe(0);
            expect(editor.get('history.length')).toBe(1);
            expect(editor.get('changes.length')).toBe(0);
        }
        // redo change
        {
            editor.redo();

            expect(editor.get('history.current')).toBe(1);
            expect(editor.get('history.length')).toBe(1);
            expect(editor.get('changes.length')).toBe(1);
        }
        // redo change again
        {
            editor.redo();

            expect(editor.get('history.current')).toBe(1);
            expect(editor.get('history.length')).toBe(1);
            expect(editor.get('changes.length')).toBe(1);
        }
    });

    it('reverts pending changes and remains empty on repeated revert', async () => {
        editor.addFeature({
            type: 'Feature', properties: {featureClass: 'NAVLINK'},
            geometry: {type: 'LineString', coordinates: editor.toGeoJSONCoordinates([{x: 110, y: 110}, {x: 120, y: 210}])}
        });
        // revert change
        {
            await waitForEditorReady(editor, ()=>{
                editor.revert();
            });

            expect(editor.info()).toHaveLength(0);
            expect(editor.get('history.current')).toBe(0);
            expect(editor.get('history.length')).toBe(0);
            expect(editor.get('changes.length')).toBe(0);
        }
        // revert change again
        {
            await waitForEditorReady(editor, ()=>{
                editor.revert();
            });

            expect(editor.info()).toHaveLength(0);
            expect(editor.get('history.current')).toBe(0);
            expect(editor.get('history.length')).toBe(0);
            expect(editor.get('changes.length')).toBe(0);
        }
    });
});
