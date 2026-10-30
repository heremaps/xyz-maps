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
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './poi_editable_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('poi editable', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let poi;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.63813, latitude: 16.50068},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        poi = preparedData.getFeature('placeLayer', -29532);
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('set poi to not editable and validate its coordinate', function() {
        poi.editable(false);

        expect(poi.coord()).toEqualWithTolerance([80.637593558, 16.500937174, 0], 1e-6);
    });

    it('drag the POI object and validate its coordinate again', async function() {
        await waitForEditorReady(editor, async ()=>{
            await drag(mapContainer, {x: 300, y: 250}, {x: 200, y: 250});
        });

        expect(poi.coord()).toEqualWithTolerance([80.637593558, 16.500937174, 0], 1e-6);
    });

    it('set poi to editable and drag it', async function() {
        await waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 80.63813, latitude: 16.50068});
        });

        poi.editable(true);

        await userEvent.click(mapContainer, {position: {x: 300, y: 250}, modifiers: ['Alt']});

        await drag(mapContainer, {x: 300, y: 250}, {x: 370, y: 250});

        expect(poi.coord()).toEqualWithTolerance([80.637969066, 16.500937174, 0], 1e-6);
    });
});
