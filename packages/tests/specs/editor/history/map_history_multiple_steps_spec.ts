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
import {createEditorFixture, waitForEditorReady} from 'editorUtils';
import {beforeEach, describe, expect, it} from 'vitest';
import dataset from './map_history_multiple_steps_spec.json';

describe('map history for multiple steps redo and undo', function() {
    var editor;
    var display;
    var preparedData;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {latitude: 18.865855, longitude: 73.07682},
            zoomlevel: 18
        }));
    });

    it('restores each editing step through undo and redo', async () => {
        // add objects and validate
        {
            var lnk = {
                type: 'Feature',
                properties: {featureClass: 'NAVLINK'},
                geometry: {
                    type: 'LineString',
                    coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 150}, {x: 300, y: 150}])
                }
            };

            var poi1 = {
                type: 'Feature',
                properties: {featureClass: 'PLACE'},
                geometry: {
                    type: 'Point',
                    coordinates: editor.toGeoJSONCoordinates({x: 100, y: 200})
                }
            };

            var poi2 = {
                type: 'Feature',
                properties: {featureClass: 'PLACE'},
                geometry: {
                    type: 'Point',
                    coordinates: editor.toGeoJSONCoordinates({x: 200, y: 200})
                }
            };

            var poi3 = {
                type: 'Feature',
                properties: {featureClass: 'PLACE'},
                geometry: {
                    type: 'Point',
                    coordinates: editor.toGeoJSONCoordinates({x: 250, y: 200})
                }
            };

            var poi4 = {
                type: 'Feature',
                properties: {featureClass: 'PLACE'},
                geometry: {
                    type: 'Point',
                    coordinates: editor.toGeoJSONCoordinates({x: 250, y: 250})
                }
            };

            editor.addFeature(lnk, preparedData.getLayers('linkLayer'));
            editor.addFeature(poi1, preparedData.getLayers('placeLayer'));
            editor.addFeature(poi2, preparedData.getLayers('placeLayer'));
            editor.addFeature(poi3, preparedData.getLayers('placeLayer'));
            editor.addFeature(poi4, preparedData.getLayers('placeLayer'));

            expect(editor.get('history.current')).toBe(5);
            expect(editor.get('history.length')).toBe(5);
            expect(editor.get('changes.length')).toBe(5);
        }

        // undo again and validate
        {
            editor.undo(2);

            expect(editor.get('history.current')).toBe(3);
            expect(editor.get('history.length')).toBe(5);
            expect(editor.get('changes.length')).toBe(3);
        }

        // undo and validate
        {
            editor.undo();

            expect(editor.get('history.current')).toBe(2);
            expect(editor.get('history.length')).toBe(5);
            expect(editor.get('changes.length')).toBe(2);
        }

        // redo and validate
        {
            editor.redo(2);

            expect(editor.get('history.current')).toBe(4);
            expect(editor.get('history.length')).toBe(5);
            expect(editor.get('changes.length')).toBe(4);
        }

        // redo again and validate
        {
            editor.redo(3);

            expect(editor.get('history.current')).toBe(4);
            expect(editor.get('history.length')).toBe(5);
            expect(editor.get('changes.length')).toBe(4);
        }

        // revert changes then redo and validate
        {
            await waitForEditorReady(editor, ()=>{
                editor.revert();
            });

            editor.redo();

            expect(editor.get('history.current')).toBe(0);
            expect(editor.get('history.length')).toBe(0);
            expect(editor.get('changes.length')).toBe(0);
        }
    });
});
