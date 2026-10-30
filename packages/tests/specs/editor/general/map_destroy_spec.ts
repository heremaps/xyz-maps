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
import {waitForViewportReady} from 'displayUtils';
import {drag} from 'triggerEvents';
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './map_destroy_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('destroy editor', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.706833, latitude: 13.350071},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);

        mapContainer = display.getContainer();

        editor.addFeature({
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 100}, {x: 200, y: 100}, {x: 200, y: 50}])
            }
        });
    });

    afterAll(async function() {
        if (editor.destroy) editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate editor is working', async function() {
        expect(editor.info()).toHaveLength(1);

        expect(editor.get('history.current')).toBe(1);
        expect(editor.get('history.length')).toBe(1);
        expect(editor.get('changes.length')).toBe(1);

        await userEvent.click(mapContainer, {position: {x: 200, y: 100}, modifiers: ['Alt']});
        await drag(mapContainer, {x: 200, y: 100}, {x: 250, y: 100});

        expect(display.getCenter()).toEqual({longitude: 76.706833, latitude: 13.350071});
    });

    it('destroy editor and validate', async function() {
        editor.destroy();

        await userEvent.click(mapContainer, {position: {x: 100, y: 100}, modifiers: ['Alt']});
        await waitForViewportReady(display, async ()=>{
            await drag(mapContainer, {x: 100, y: 100}, {x: 150, y: 100});
        });

        expect(display.getCenter()).not.toEqual(expect.objectContaining({longitude: 76.706833, latitude: 13.350071}));

        expect(editor).toEqual({});
    });
});
