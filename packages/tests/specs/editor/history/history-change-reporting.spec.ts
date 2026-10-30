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
import {drag} from 'triggerEvents';
import {beforeEach, describe, expect, it} from 'vitest';
import dataset from './history-change-reporting.json';

describe('History change reporting', function() {
    var editor;
    var display;
    var preparedData;

    var link1;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 73.192904, latitude: 18.916527},
            zoomlevel: 18
        }));

        link1 = preparedData.getFeature('linkLayer', -189004);
    });

    it('reports creation and link-edit changes, then restores the creation through undo', async () => {
        // add a link object
        {
            let p = {
                type: 'Feature',
                properties: {featureClass: 'PLACE'},
                geometry: {
                    type: 'Point',
                    coordinates: editor.toGeoJSONCoordinates({x: 100, y: 200})
                }
            };
            let poi = editor.addFeature(p, preparedData.getLayers('paLayer'));

            expect(editor.get('history.current')).toBe(1);
            expect(editor.get('history.length')).toBe(1);
            expect(editor.get('changes.length')).toBe(1);
        }
        // get a link and select
        {
            link1.select();
            let mapContainer = display.getContainer();
            await drag(mapContainer, {x: 300, y: 200}, {x: 300, y: 150});

            expect(editor.get('history.current')).toBe(2);
            expect(editor.get('history.length')).toBe(2);
            expect(editor.get('changes.length')).toBe(5);

            expect(editor.info()).toHaveLength(5);
        }
        // undo changes
        {
            editor.undo();

            expect(editor.get('history.current')).toBe(1);
            expect(editor.get('history.length')).toBe(2);
            expect(editor.get('changes.length')).toBe(1);

            expect(editor.info()).toHaveLength(1);
        }
    });
});
