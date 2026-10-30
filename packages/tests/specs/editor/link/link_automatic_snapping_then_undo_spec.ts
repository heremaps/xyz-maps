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
import dataset from './link_automatic_snapping_then_undo_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('drag a link shape point to the other one and then undo', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link2;
    let linkLayer;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.229901, latitude: 15.187356},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link2 = preparedData.getFeature('linkLayer', -189027);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('get a link to select and drag', async function() {
        link2.select();

        await drag(mapContainer, {x: 462, y: 389}, {x: 275, y: 228});

        expect(editor.info()).toHaveLength(1);

        let objs = editor.search(display.getViewBounds());
        expect(objs).toHaveLength(1);
    });

    it('undo last drag and validate', async function() {
        editor.undo();

        expect(editor.info()).toHaveLength(0);

        let objs = editor.search(display.getViewBounds());
        expect(objs).toHaveLength(2);

        link2 = editor.getFeature(link2.id, linkLayer);
        let coord = link2.coord();
        expect(coord).toEqualWithTolerance([
            [76.22923083, 15.187728775, 0],
            [76.230233976, 15.186895307, 0]
        ], 1e-6);
    });
});
