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
import {waitForEditorReady, clean, submit} from 'editorUtils';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './poi_create_remove_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('add POI object and then remove', function() {
    let editor;
    let display;
    let preparedData;
    let idMaps = [];
    let link1;
    let poi1;
    let link2;
    let poi2;
    let linkLayer;
    let placeLayer;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.2357240158081, latitude: 13.005706927303237},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        linkLayer = preparedData.getLayers('linkLayer');
        placeLayer = preparedData.getLayers('placeLayer');
    });

    afterAll(async function() {
        await clean(editor, idMaps);
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('add link and poi object and validate coord and attributes', function() {
        let p = {
            type: 'Feature',
            properties: {featureClass: 'PLACE', type: 'hotel'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 100, y: 250})
            }
        };
        let l = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 100}, {x: 200, y: 300}])
            }
        };
        link1 = editor.addFeature(l, linkLayer);
        poi1 = editor.addFeature(p, placeLayer);

        expect(link1.coord()).toEqualWithTolerance([[77.23411469, 13.006752287, 0], [77.234651132, 13.005706927, 0]], 1e-6);
        expect(poi1.coord()).toEqualWithTolerance([77.23411469, 13.005968268, 0], 1e-6);

        expect(poi1.getLink()).toBe(null);
        expect(poi1.prop('type')).toBe('hotel');
    });

    it('add more link and poi object and validate again coord and attributes', function() {
        let p = {
            type: 'Feature',
            properties: {routingLink: 0, featureClass: 'PLACE', type: 'hospital'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 200, y: 250})
            }
        };
        let l = {
            type: 'Feature',
            id: 0,
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 200, y: 100}, {x: 300, y: 300}])
            }
        };

        let obj = editor.addFeature([l, p], linkLayer, {x: 50, y: 0});
        link2 = obj[0];
        poi2 = obj[1];

        expect(link2.coord()).toEqualWithTolerance([[77.234919352, 13.006752287, 0], [77.235455794, 13.005706927, 0]], 1e-6);
        expect(poi2.coord()).toEqualWithTolerance([77.234919352, 13.005968268, 0], 1e-6);

        expect(poi2.getLink().id).toBe(link2.id);
        expect(poi2.prop('type')).toBe('hospital');
    });

    it('add a POI for restaurant, validate its type', function() {
        let p = {
            type: 'Feature',
            properties: {featureClass: 'PLACE', type: 'restaurant'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 300, y: 250})
            }
        };
        let poi = editor.addFeature(p, preparedData.getLayers('placeLayer'));

        expect(poi.prop('type')).toBe('restaurant');
    });

    it('submit created objects and validate again', async function() {
        let idMap;

        await waitForEditorReady(editor, async ()=>{
            idMap = await submit(editor);
            idMaps.push(idMap);
        });

        let poi1Id = idMap.permanentIDMap[poi1.getProvider().id][poi1.id];
        let link1Id = idMap.permanentIDMap[link1.getProvider().id][link1.id];

        let poi2Id = idMap.permanentIDMap[poi2.getProvider().id][poi2.id];
        let link2Id = idMap.permanentIDMap[link2.getProvider().id][link2.id];

        poi1 = editor.getFeature(poi1Id, placeLayer);
        link1 = editor.getFeature(link1Id, linkLayer);

        poi2 = editor.getFeature(poi2Id, linkLayer);
        link2 = editor.getFeature(link2Id, linkLayer);

        expect(poi1.getLink()).toBe(null);
        expect(poi2.getLink().id).toBe(link2.id);
    });


    it('set navigation point for POI', function() {
        poi1.createRoutingPoint();

        expect(poi1.getLink().id).toBe(link1.id);
    });

    it('remove navigation point for POI', function() {
        poi1.removeRoutingPoint();

        expect(poi1.getLink()).toBe(null);
    });


    it('remove  POI', function() {
        poi1.remove();
        expect(poi1.prop('removed')).toBe('HOOK');
        expect(poi1.prop('estate')).toBe('REMOVED');
    });
});
