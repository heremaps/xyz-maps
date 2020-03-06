/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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
import {Listener, prepare} from 'utils';
import {waitForEditorReady} from 'editorUtils';
import {click} from 'triggerEvents';
import {Map} from '@here/xyz-maps-core';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './map_listener_click_spec.json';

describe('map click listener', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.5553, latitude: 13.99646},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('start listener and validate events', async function() {
        let listener = new Listener(editor, ['pointerup']);

        // lick on Address
        await click(mapContainer, 300, 260);

        // click on address navigation point
        await click(mapContainer, 300, 200);

        // click on map
        await click(mapContainer, 631, 324);

        // click on link
        await click(mapContainer, 350, 200);

        // click on link shape point
        await click(mapContainer, 400, 200);

        let results = listener.stop();

        expect(results.pointerup).to.have.lengthOf(5);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 300,
            mapY: 260,
            type: 'pointerup'
        });
        expect(results.pointerup[1]).to.deep.include({
            button: 0,
            mapX: 300,
            mapY: 200,
            type: 'pointerup'
        });
        expect(results.pointerup[2]).to.deep.include({
            button: 0,
            mapX: 631,
            mapY: 324,
            type: 'pointerup'
        });
        expect(results.pointerup[3]).to.deep.include({
            button: 0,
            mapX: 350,
            mapY: 200,
            type: 'pointerup'
        });
        expect(results.pointerup[4]).to.deep.include({
            button: 0,
            mapX: 400,
            mapY: 200,
            type: 'pointerup'
        });
    });
});
