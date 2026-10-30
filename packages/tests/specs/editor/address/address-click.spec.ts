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
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './address-click.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Address click', function() {
    let preparedData;
    let poi;
    let address;

    let editor;
    let display;
    let mapContainer;

    beforeAll(async function() {
        preparedData = await prepare(dataset);

        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.284222, latitude: 14.125044},
            zoomlevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);

        mapContainer = display.getContainer();

        poi = preparedData.getFeature('placeLayer', -30154);
        address = preparedData.getFeature('paLayer', -49140);
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('validate address coordinate with click', async function() {
        expect(address.coord()).toEqualWithTolerance([76.283418331, 14.125304508, 0], 1e-6);

        // click on an address
        await userEvent.click(mapContainer, {position: {x: 100, y: 200}, modifiers: ['Alt']});

        // validate address coordinate again
        expect(address.coord()).toEqualWithTolerance([76.283418331, 14.125304508, 0], 1e-6);

        // valiate object is not modified
        expect(editor.info().length).toBe(0);
    });

    it('validate poi coordinate with click', async function() {
        expect(poi.coord()).toEqualWithTolerance([76.283954773, 14.125304508, 0], 1e-6);

        // click on POI
        await userEvent.click(mapContainer, {position: {x: 300, y: 200}, modifiers: ['Alt']});

        // validate POI coordinate
        expect(poi.coord()).toEqualWithTolerance([76.283954773, 14.125304508, 0], 1e-6);

        // valiate object is not modified
        expect(editor.info().length).toBe(0);
    });

    it('add address object and validate its coord', async function() {
        // add address object
        let a = {
            type: 'Feature',
            properties: {featureClass: 'ADDRESS'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 200, y: 200})
            }
        };
        let address = editor.addFeature(a, preparedData.getLayers('paLayer'));

        // click on an address
        await userEvent.click(mapContainer, {position: {x: 200, y: 200}, modifiers: ['Alt']});

        // validate address coordinate
        expect(address.coord()).toEqualWithTolerance([76.283685558, 14.125304111, 0], 1e-6);

        // click on ground
        await userEvent.click(mapContainer, {position: {x: 300, y: 200}, modifiers: ['Alt']});
    });
});
