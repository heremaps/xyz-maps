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
import dataset from './history.json';

describe('History', function() {
    var editor;
    var display;
    var preparedData;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {latitude: 18.865855, longitude: 73.07682},
            zoomlevel: 18
        }));
    });

    it('undoes and redoes a geometry change without modifying another feature', () => {
        const layer = preparedData.getLayers('placeLayer');
        const first = editor.addFeature({
            type: 'Feature',
            properties: {featureClass: 'PLACE'},
            geometry: {type: 'Point', coordinates: [73.07682, 18.865855, 0]}
        }, layer);
        const other = editor.addFeature({
            type: 'Feature',
            properties: {featureClass: 'PLACE'},
            geometry: {type: 'Point', coordinates: [73.077, 18.866, 0]}
        }, layer);
        const original = structuredClone(first.coord());
        const untouched = structuredClone(other.coord());
        first.coord([73.0771, 18.8659, 0]);
        const modified = structuredClone(first.coord());

        editor.undo();
        expect(editor.getFeature(first.id, layer).coord()).toEqual(original);
        expect(editor.getFeature(other.id, layer).coord()).toEqual(untouched);
        editor.redo();
        expect(editor.getFeature(first.id, layer).coord()).toEqual(modified);
        expect(editor.getFeature(other.id, layer).coord()).toEqual(untouched);
    });

    it('adds two places, restores them through undo and redo, then reverts', async () => {
        // add a poi object and validate
        {
            var poi1 = {
                type: 'Feature',
                properties: {featureClass: 'PLACE'},
                geometry: {
                    type: 'Point',
                    coordinates: editor.toGeoJSONCoordinates({x: 100, y: 200})
                }
            };

            editor.addFeature(poi1, preparedData.getLayers('placeLayer'));

            expect(editor.get('history.current')).toBe(1);
            expect(editor.get('history.length')).toBe(1);
            expect(editor.get('changes.length')).toBe(1);
        }
        // add another poi object and validate
        {
            var poi2 = {
                type: 'Feature',
                properties: {featureClass: 'PLACE'},
                geometry: {
                    type: 'Point',
                    coordinates: editor.toGeoJSONCoordinates({x: 200, y: 200})
                }
            };
            editor.addFeature(poi2, preparedData.getLayers('placeLayer'));

            expect(editor.get('history.current')).toBe(2);
            expect(editor.get('history.length')).toBe(2);
            expect(editor.get('changes.length')).toBe(2);
        }
        // undo change and validate
        {
            editor.undo();

            expect(editor.get('history.current')).toBe(1);
            expect(editor.get('history.length')).toBe(2);
            expect(editor.get('changes.length')).toBe(1);
        }
        // redo change and validate
        {
            editor.redo();

            expect(editor.get('history.current')).toBe(2);
            expect(editor.get('history.length')).toBe(2);
            expect(editor.get('changes.length')).toBe(2);
        }
        // revert changes
        {
            await waitForEditorReady(editor, ()=>{
                editor.revert();
            });

            expect(editor.get('history.current')).toBe(0);
            expect(editor.get('history.length')).toBe(0);
            expect(editor.get('changes.length')).toBe(0);

            let objs = editor.search(display.getViewBounds());
            expect(objs).toHaveLength(0);
        }
    });

    it('clears history when reverting an undone creation', async () => {
        // add a poi object and validate
        {
            var poi3 = {
                type: 'Feature',
                properties: {featureClass: 'PLACE'},
                geometry: {
                    type: 'Point',
                    coordinates: editor.toGeoJSONCoordinates({x: 250, y: 200})
                }
            };
            editor.addFeature(poi3, preparedData.getLayers('placeLayer'));

            expect(editor.get('history.current')).toBe(1);
            expect(editor.get('history.length')).toBe(1);
            expect(editor.get('changes.length')).toBe(1);
        }
        // undo change and validate
        {
            editor.undo();

            expect(editor.get('history.current')).toBe(0);
            expect(editor.get('history.length')).toBe(1);
            expect(editor.get('changes.length')).toBe(0);
        }
        // revert changes
        {
            await waitForEditorReady(editor, ()=>{
                editor.revert();
            });

            expect(editor.get('history.current')).toBe(0);
            expect(editor.get('history.length')).toBe(0);
            expect(editor.get('changes.length')).toBe(0);

            let objs = editor.search(display.getViewBounds());
            expect(objs).toHaveLength(0);
        }
    });

    it('clears history when reverting a redone creation', async () => {
        // add a poi object and validate
        {
            var poi4 = {
                type: 'Feature',
                properties: {featureClass: 'PLACE'},
                geometry: {
                    type: 'Point',
                    coordinates: editor.toGeoJSONCoordinates({x: 250, y: 250})
                }
            };
            editor.addFeature(poi4, preparedData.getLayers('placeLayer'));

            expect(editor.get('history.current')).toBe(1);
            expect(editor.get('history.length')).toBe(1);
            expect(editor.get('changes.length')).toBe(1);
        }
        // undo change and validate
        {
            editor.undo();

            expect(editor.get('history.current')).toBe(0);
            expect(editor.get('history.length')).toBe(1);
            expect(editor.get('changes.length')).toBe(0);
        }
        // redo change and validate
        {
            editor.redo();

            expect(editor.get('history.current')).toBe(1);
            expect(editor.get('history.length')).toBe(1);
            expect(editor.get('changes.length')).toBe(1);
        }
        // revert changes
        {
            await waitForEditorReady(editor, ()=>{
                editor.revert();
            });

            expect(editor.get('history.current')).toBe(0);
            expect(editor.get('history.length')).toBe(0);
            expect(editor.get('changes.length')).toBe(0);

            let objs = editor.search(display.getViewBounds());
            expect(objs).toHaveLength(0);
        }
    });
});
