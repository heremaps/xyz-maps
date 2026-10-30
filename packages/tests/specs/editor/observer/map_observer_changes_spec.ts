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
import {Observer, prepare} from 'utils';
import {waitForEditorReady, clean, submit} from 'editorUtils';
import dataset from './map_observer_changes_spec.json';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('map changes observers', function() {
    let preparedData;
    let editor;
    let display;
    let idMaps = [];

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.99846774250119, latitude: 12.959476417718449},
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

        await preparedData.clear();
    });

    it('observe changes history with undo, redo', async function() {
        let observer = new Observer(editor, 'history.current');

        let addr1 = {
            type: 'Feature',
            properties: {featureClass: 'ADDRESS'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 200, y: 300})
            }
        };
        let lnk = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 200}, {x: 200, y: 300}])
            }
        };

        editor.addFeature(lnk, preparedData.getLayers('linkLayer'));
        editor.addFeature(addr1, preparedData.getLayers('paLayer'));

        editor.undo();
        editor.redo();

        await waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        let results = observer.stop();
        expect(results['history.current']).toStrictEqual([1, 2, 1, 2, 0]);
    });

    it('observe changes history with undo, revert and submit', async function() {
        let observer = new Observer(editor, 'history.current');

        let addr1 = {
            type: 'Feature',
            properties: {featureClass: 'ADDRESS'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 200, y: 300})
            }
        };
        editor.addFeature(addr1, preparedData.getLayers('paLayer'));

        editor.undo();

        await waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        let addr2 = {
            type: 'Feature',
            properties: {featureClass: 'ADDRESS'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 300, y: 300})
            }
        };
        editor.addFeature(addr2, preparedData.getLayers('paLayer'));
        let idMap;
        await waitForEditorReady(editor, async ()=>{
            idMap = await submit(editor);
            idMaps.push(idMap);
        });

        let results = observer.stop();
        expect(results['history.current']).toStrictEqual([1, 0, 0, 1, 0]);
    });
});
