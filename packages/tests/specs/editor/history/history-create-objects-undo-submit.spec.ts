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
import {waitForEditorReady, submit} from 'editorUtils';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './history-create-objects-undo-submit.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('History undo and submit after feature creation', function() {
    var editor;
    var display;

    beforeAll(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.437315, latitude: 18.811783},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
    });

    it('add a link object', function() {
        let l = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 300, y: 100}, {x: 300, y: 200}])
            }
        };
        let link = editor.addFeature(l);

        expect(editor.info()).toHaveLength(1);
        expect(editor.get('history.current')).toBe(1);
        expect(editor.get('history.length')).toBe(1);
        expect(editor.get('changes.length')).toBe(1);
    });

    it('revert objects and add link objects', async function() {
        await waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        let l1 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 200, y: 100}, {x: 100, y: 100}])
            }
        };
        let l2 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 300, y: 200}, {x: 200, y: 250}])
            }
        };
        editor.addFeature(l1);
        editor.addFeature(l2);

        let objs = editor.search(display.getViewBounds());

        expect(objs).toHaveLength(2);
        expect(editor.info()).toHaveLength(2);
        expect(editor.get('history.current')).toBe(2);
        expect(editor.get('history.length')).toBe(2);
        expect(editor.get('changes.length')).toBe(2);
    });

    it('undo once and validate', function() {
        editor.undo();

        let objs = editor.search(display.getViewBounds());

        expect(objs).toHaveLength(1);
        expect(editor.info()).toHaveLength(1);
        expect(editor.get('history.current')).toBe(1);
        expect(editor.get('history.length')).toBe(2);
        expect(editor.get('changes.length')).toBe(1);
    });


    it('submit and validate only one link is in viewport', async function() {
        await waitForEditorReady(editor, async ()=>{
            await submit(editor);
        });

        let objs = editor.search(display.getViewBounds());

        expect(objs).toHaveLength(1);
        expect(editor.info()).toHaveLength(0);
        expect(editor.get('history.current')).toBe(0);
        expect(editor.get('history.length')).toBe(0);
        expect(editor.get('changes.length')).toBe(0);
    });
});
