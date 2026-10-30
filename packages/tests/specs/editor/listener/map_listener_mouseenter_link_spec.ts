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
import {Listener, prepare, waitForPointerEvent} from 'utils';
import {waitForEditorReady} from 'editorUtils';
import {waitForViewportReady} from 'displayUtils';
import {mousemove} from 'triggerEvents';
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './map_listener_mouseenter_link_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('map mouseenter link when link layer is removed', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;

    let linkLayer;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.38670452269983, latitude: 11.927986024207911},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        linkLayer = preparedData.getLayers('linkLayer');
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate mouse hover events', async function() {
        // click on map
        await userEvent.click(mapContainer, {position: {x: 150, y: 100}, modifiers: ['Alt']});
        await mousemove(mapContainer, {x: 150, y: 100}, {x: 200, y: 100});

        // click on link
        await userEvent.click(mapContainer, {position: {x: 330, y: 167}, modifiers: ['Alt']});

        // click on map
        await userEvent.click(mapContainer, {position: {x: 350, y: 132}, modifiers: ['Alt']});

        // Refresh hover after deselection before recording the explicit hover sequence.
        await waitForPointerEvent(display, 'pointermove', () =>
            mousemove(mapContainer, {x: 350, y: 132}, {x: 350, y: 132}));
        let listener = new Listener(editor, ['pointerenter', 'pointerleave']);

        // mouse over a link
        await waitForPointerEvent(editor, 'pointerenter', async () => {
            await mousemove(mapContainer, {x: 350, y: 132}, {x: 330, y: 167});
        });

        // Move away from the link position; this step does not guarantee a pointerleave.
        await mousemove(mapContainer, {x: 330, y: 167}, {x: 360, y: 132});

        // mouse over a POI
        await waitForPointerEvent(editor, 'pointerenter', async () => {
            await mousemove(mapContainer, {x: 300, y: 132}, {x: 285, y: 146});
        });

        // mouse out of a poi
        await waitForPointerEvent(editor, 'pointerleave', async () => {
            await mousemove(mapContainer, {x: 285, y: 146}, {x: 285, y: 130});
        });

        let results = listener.stop();

        expect(results.pointerenter).toHaveLength(2);
        expect(results.pointerleave).toHaveLength(2);
    });

    it('remove link layer, validate mouse hover events', async function() {
        editor.removeLayer(linkLayer);

        // click on link
        await userEvent.click(mapContainer, {position: {x: 330, y: 167}, modifiers: ['Alt']});

        // click on map
        await userEvent.click(mapContainer, {position: {x: 350, y: 132}, modifiers: ['Alt']});

        await waitForPointerEvent(display, 'pointermove', () =>
            mousemove(mapContainer, {x: 350, y: 132}, {x: 350, y: 132}));
        let listener = new Listener(editor, ['pointerenter', 'pointerleave']);

        // mouse over a link
        await mousemove(mapContainer, {x: 350, y: 132}, {x: 330, y: 167});

        // Move away from the link position; this step does not guarantee a pointerleave.
        await mousemove(mapContainer, {x: 330, y: 167}, {x: 360, y: 132});

        // mouse over a POI
        await waitForPointerEvent(editor, 'pointerenter', () =>
            mousemove(mapContainer, {x: 300, y: 132}, {x: 285, y: 146}));

        // mouse out of a poi
        await waitForPointerEvent(editor, 'pointerleave', () =>
            mousemove(mapContainer, {x: 285, y: 146}, {x: 285, y: 130}));

        let results = listener.stop();

        expect(results.pointerenter).toHaveLength(1);
        expect(results.pointerleave).toHaveLength(1);
    });


    it('add link layer, validate mouse hover events', async function() {
        editor.addLayer(linkLayer);

        await waitForViewportReady(display);

        // click on link
        await userEvent.click(mapContainer, {position: {x: 330, y: 167}, modifiers: ['Alt']});

        // click on map
        await userEvent.click(mapContainer, {position: {x: 350, y: 132}, modifiers: ['Alt']});

        await waitForPointerEvent(display, 'pointermove', () =>
            mousemove(mapContainer, {x: 350, y: 132}, {x: 350, y: 132}));
        let listener = new Listener(editor, ['pointerenter', 'pointerleave']);

        // mouse over a link
        await waitForPointerEvent(editor, 'pointerenter', () =>
            mousemove(mapContainer, {x: 350, y: 132}, {x: 330, y: 167}));

        // Move away from the link position; this step does not guarantee a pointerleave.
        await mousemove(mapContainer, {x: 330, y: 167}, {x: 360, y: 132});

        // mouse over a POI
        await waitForPointerEvent(editor, 'pointerenter', () =>
            mousemove(mapContainer, {x: 300, y: 132}, {x: 285, y: 146}));

        // mouse out of a poi
        await waitForPointerEvent(editor, 'pointerleave', () =>
            mousemove(mapContainer, {x: 285, y: 146}, {x: 285, y: 130}));

        let results = listener.stop();

        expect(results.pointerenter).toHaveLength(2);
        expect(results.pointerleave).toHaveLength(2);
    });
});
