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
import {drag} from 'triggerEvents';
import {describe, expect, it} from 'vitest';
import dataset from './autoconnectshapedistance_spec.json';

describe('set snapTolerance', function() {
    let preparedData;
    let editor;
    let display;
    let mapContainer;

    async function setup(options: Parameters<typeof createEditorFixture>[2] = {}) {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 77.84172527566523, latitude: 17.450976000022266},
            zoomlevel: 19
        }, options));

        mapContainer = display.getContainer();
    }

    it('set snapTolerance, drag a shape and it auto connects to another shape', async function() {
        await setup({snapTolerance: 10});

        await waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 77.84172527566523, latitude: 17.450976000022266});
            display.setZoomlevel(19);
        });

        let l1 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 300}, {x: 400, y: 300}])
            }
        };
        let l2 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 300}, {x: 100, y: 100}])
            }
        };
        let links = editor.addFeature([l1, l2]);

        links[1].select();

        await drag(mapContainer, {x: 100, y: 100}, {x: 100, y: 265});
        expect(editor.info()).toHaveLength(1);

        await waitForEditorReady(editor, ()=>{
            editor.revert();
        });
    });

    it('reset snapTolerance, drag a shape and it auto connects to another shape again', async function() {
        await setup({});

        await waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 77.84172527566523, latitude: 17.450976000022266});
            display.setZoomlevel(19);
        });

        let l1 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 300}, {x: 400, y: 300}])
            }
        };
        let l2 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 300}, {x: 100, y: 100}])
            }
        };
        let links = editor.addFeature([l1, l2]);

        links[1].select();

        await drag(mapContainer, {x: 100, y: 100}, {x: 100, y: 265});
        expect(editor.info()).toHaveLength(2);

        await drag(mapContainer, {x: 100, y: 265}, {x: 100, y: 294});
        expect(editor.info()).toHaveLength(1);

        await waitForEditorReady(editor, ()=>{
            editor.revert();
        });
    });
});
