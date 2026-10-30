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
import dataset from './minshapedistance_spec.json';

describe('set snapTolerance', function() {
    let editor;
    let display;
    let preparedData;

    async function setup(options: Parameters<typeof createEditorFixture>[2] = {}) {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 77.84172527566523, latitude: 17.450976000022266},
            zoomlevel: 19
        }, options));
    }

    it('set snapTolerance, validate new link created', async function() {
        await setup({snapTolerance: 5});

        await waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 77.84172527566523, latitude: 17.450976000022266});
            display.setZoomlevel(19);
        });

        let link1 = editor.addFeature({
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 300}, {x: 400, y: 300}, {x: 410, y: 300}])
            }
        });
        let link2 = editor.addFeature({
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 350}, {x: 400, y: 350}, {x: 418, y: 350}])
            }
        });

        // validate link1 has 2 shape points, 1 shape point is eleminated because minimum distance of shapes is 5 meters
        expect(link1.coord()).toHaveLength(2);
        expect(link2.coord()).toHaveLength(3);
    });

    it('reset snapTolerance, validate new link created again', async function() {
        await setup({});

        await waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 77.84172527566523, latitude: 17.450976000022266});
            display.setZoomlevel(19);
        });

        let link1 = editor.addFeature({
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 300}, {x: 400, y: 300}, {x: 410, y: 300}])
            }
        });
        let link2 = editor.addFeature({
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 350}, {x: 400, y: 350}, {x: 418, y: 350}])
            }
        });
        let link3 = editor.addFeature({
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 400}, {x: 400, y: 400}, {x: 405, y: 400}])
            }
        });

        // validate link1 has 3 shape points
        // validate link3 has 2 shape points, 1 shape point is eleminated because default minimum distance of shapes is 2 meters
        expect(link1.coord()).toHaveLength(3);
        expect(link2.coord()).toHaveLength(3);
        expect(link3.coord()).toHaveLength(2);
    });
});
