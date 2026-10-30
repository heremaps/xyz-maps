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
import {describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import dataset from './featureselectionbydefault_spec.json';

describe('set featureSelectionByDefault', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;

    async function setup(options: Parameters<typeof createEditorFixture>[2] = {}) {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 77.84172527566523, latitude: 17.450976000022266},
            zoomlevel: 19
        }, options));

        mapContainer = display.getContainer();
    }

    it('set featureSelectionByDefault to false, validate after clicking the link', async function() {
        await setup({featureSelectionByDefault: false});

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

        // click on a link
        await userEvent.click(mapContainer, {position: {x: 100, y: 200}, modifiers: ['Alt']});

        // validate link is not selected
        expect(links[1].editState('selected')).toBe(false);
    });

    it('reset everything, validate the disconnect shape distance again', async function() {
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

        // click on a link
        await userEvent.click(mapContainer, {position: {x: 100, y: 200}, modifiers: ['Alt']});

        // validate link is selected
        expect(links[1].editState('selected')).toBe(true);
    });
});
