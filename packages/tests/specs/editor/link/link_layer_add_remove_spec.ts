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
import {drag, click} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './link_layer_add_remove_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Link layer add and remove', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;
    let poi;
    let linkLayer;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.33726, latitude: 14.029014},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        linkLayer = preparedData.getLayers('linkLayer');

        link = preparedData.getFeature('linkLayer', -189074);
        poi = preparedData.getFeature('placeLayer', -29521);
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('remove objects in viewpoint', function() {
        let objs = editor.search(display.getViewBounds());
        expect(objs).toHaveLength(2);
    });


    it('remove link layer', function() {
        editor.removeLayer(linkLayer);

        let objs = editor.search(display.getViewBounds());
        expect(objs).toHaveLength(1);
        expect(editor.getLayers()).toHaveLength(1);
    });

    it('drag poi and validate it is not dragged', async function() {
        await click(mapContainer, 200, 250);
        await drag(mapContainer, {x: 200, y: 250}, {x: 200, y: 280});

        expect(poi.coord()).toEqualWithTolerance([75.336187116, 14.029118089, 0], 1e-6);
    });

    it('drag link shape and valdidate map is dragged', async function() {
        await click(mapContainer, 150, 200);
        await waitForEditorReady(editor, async ()=>{
            await drag(mapContainer, {x: 400, y: 200}, {x: 450, y: 250});
        });

        expect(display.getCenter().latitude).not.toBe(14.029014);
    });

    it('move map to original area add link layer', async function() {
        await waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 75.33726, latitude: 14.029014});
        });

        editor.addLayer(linkLayer);

        let objs = editor.search(display.getViewBounds());

        expect(objs).toHaveLength(2);
    });

    it('drag link and validate map is not dragged', async function() {
        let lnk = editor.getFeature(link.id, linkLayer);
        lnk.select();

        await drag(mapContainer, {x: 400, y: 200}, {x: 300, y: 200});

        expect(display.getCenter()).toEqual({longitude: 75.33726, latitude: 14.029014});
    });
});
