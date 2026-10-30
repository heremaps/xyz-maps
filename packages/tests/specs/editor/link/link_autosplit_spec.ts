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
import {waitForEditorReady} from 'editorUtils';
import {drag} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './link_autosplit_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('link auto split', function() {
    let editor: Editor;
    let display;
    let preparedData;
    let mapContainer;
    let link1; let link2; let link3; let link4; let link5; let link6; let link7;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.97791, latitude: 12.93834},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);

        mapContainer = display.getContainer();
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('add link object validate 1 link in viewport', async function() {
        let lnk1 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 400, y: 200}, {x: 100, y: 200}])
            }
        };
        link1 = editor.addFeature(lnk1);
        link1.select();

        await drag(mapContainer, {x: 400, y: 200}, {x: 100, y: 200});

        let objs = editor.search(display.getViewBounds());

        expect(objs).toHaveLength(0);
    });

    it('add another link object and drag one shape point to another to remove one', async function() {
        let lnk2 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 100}, {x: 150, y: 200}, {x: 200, y: 200}, {x: 500, y: 200}])
            }
        };

        link2 = editor.addFeature(lnk2);
        link2.select();

        await drag(mapContainer, {x: 100, y: 100}, {x: 150, y: 200});


        expect(link2.coord()).toEqualWithTolerance([
            [76.976568895, 12.938862822, 0],
            [76.976837116, 12.938862822, 0],
            [76.978446442, 12.938862822, 0]
        ], 1e-6);

        link2.remove();
    });

    it('add link object and drag shape point to automatically split the link', async function() {
        let lnk3 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 150}, {x: 150, y: 100}, {x: 200, y: 150}, {x: 250, y: 160}])
            }
        };
        link3 = editor.addFeature(lnk3);
        link3.select();

        await drag(mapContainer, {x: 100, y: 150}, {x: 250, y: 160});

        let objs = editor.search(display.getViewBounds());
        expect(objs).toHaveLength(2);

        expect(objs[0].coord()).toEqualWithTolerance([
            [76.976837116, 12.939124232, 0],
            [76.977105337, 12.93907195, 0]
        ], 1e-6);
        expect(objs[1].coord()).toEqualWithTolerance([
            [76.977105337, 12.93907195, 0],
            [76.976568895, 12.939385643, 0],
            [76.976837116, 12.939124232, 0]
        ], 1e-6);

        await waitForEditorReady(editor, ()=>{
            editor.revert();
        });
    });

    it('add link object', async function() {
        let lnk4 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 200, y: 200}, {x: 250, y: 150}, {x: 300, y: 200}])
            }
        };
        let lnk5 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 200, y: 200}, {x: 250, y: 250}, {x: 300, y: 200}])
            }
        };
        link4 = editor.addFeature(lnk4);
        link5 = editor.addFeature(lnk5);

        link5.select();

        await drag(mapContainer, {x: 200, y: 200}, {x: 300, y: 200});

        let objs = editor.search(display.getViewBounds());
        expect(objs).toHaveLength(2);
    });


    it('add link object, drag a shape point to connect to the other one and validate new links', async function() {
        let lnk6 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK', zLevels: [0, 0, 1]},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates(<any[]>[{x: 100, y: 100}, {x: 200, y: 100}, {x: 200, y: 200, z: 1}])
            }
        };
        link6 = editor.addFeature(lnk6);

        expect(link6.getZLevels()).toStrictEqual([0, 0, 1]);
        link6.select();

        await drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 200});

        expect(link6.coord()).toEqualWithTolerance([
            [76.976837117, 12.938862822, 0],
            [76.976837116, 12.939385643, 0],
            [76.976837116, 12.938862822, 1]
        ], 1e-6);
    });

    it('add link object, drag a shape point to connect to the other one, validate link is split automatically', async function() {
        let lnk7 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK', zLevels: [1, 0, 1]},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates(<any[]>[{x: 100, y: 300, z: 1}, {x: 200, y: 300}, {x: 200, y: 400, z: 1}])
            }
        };
        link7 = editor.addFeature(lnk7);

        expect(link7.getZLevels()).toStrictEqual([1, 0, 1]);
        link7.select();

        await drag(mapContainer, {x: 100, y: 300}, {x: 200, y: 400});

        expect(link7.coord()).toEqualWithTolerance([
            [76.976837116, 12.93834, 0],
            [76.976837116, 12.937817177, 1]
        ], 1e-6);
    });
});
