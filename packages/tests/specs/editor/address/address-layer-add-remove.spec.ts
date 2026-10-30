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
import {userEvent} from 'vitest/browser';
import {Editor} from '@here/xyz-maps-editor';
import {Map} from '@here/xyz-maps-display';
import dataset from './address-layer-add-remove.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Address layer addition and removal', function() {
    let preparedData;
    let editor;
    let display;
    let mapContainer;
    let addrLayer;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: -92.87121, latitude: 40.593582},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        addrLayer = preparedData.getLayers('paLayer');
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('validate map objects in viewport', function() {
        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs.length).toBe(4);
    });

    it('remove address layer and validate', function() {
        editor.removeLayer(addrLayer);

        let objs = editor.search({rect: display.getViewBounds()});

        expect(objs.length).toBe(3);
        expect(editor.getLayers().length).toBe(3);
    });

    it('click n drag on an address, validate map is dragged', async function() {
        // click on an address
        await userEvent.click(mapContainer, {position: {x: 100, y: 200}, modifiers: ['Alt']});

        // drag on Address
        await waitForEditorReady(editor, async ()=>{
            await drag(mapContainer, {x: 100, y: 200}, {x: 154, y: 237});
        });

        let nc = display.getCenter();
        expect(nc).not.toEqual({longitude: -92.87121, latitude: 40.593582});
    });

    it('add address layer and validate', async function() {
        await waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: -92.87121, latitude: 40.593582});
        });

        editor.addLayer(addrLayer);

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs.length).toBe(4);
    });

    it('click n drag on an address, validate map is not dragged', async function() {
        // click on an address
        await userEvent.click(mapContainer, {position: {x: 100, y: 200}, modifiers: ['Alt']});

        // drag on Address
        await drag(mapContainer, {x: 100, y: 200}, {x: 154, y: 237});

        let nc = display.getCenter();
        expect(nc).toEqual({longitude: -92.87121, latitude: 40.593582});

        // click on ground
        await userEvent.click(mapContainer, {position: {x: 300, y: 200}, modifiers: ['Alt']});
    });
});
