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
import {vi, describe, beforeAll, afterAll, it, chai, expect} from 'vitest';
import {mousemove} from 'triggerEvents';
import {Editor} from '@here/xyz-maps-editor';
import {Map} from '@here/xyz-maps-display';
import chaiAlmost from 'chai-almost';
import dataset from './marker_spec.json';

describe('Basic Marker tests', () => {
    let editor;
    let display;
    let preparedData;
    let marker;
    let mapContainer;

    beforeAll(async () => {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.29398409, latitude: 19.27905288},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await waitForEditorReady(editor);

        mapContainer = display.getContainer();

        marker = preparedData.getFeature('markerLayer', 'MyMarker');
    });

    afterAll(async () => {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('test default editStates', async () => {
        expect(marker.editState('selected')).toBe(false);
        expect(marker.editState('hovered')).toBe(false);
    });

    it('test hovered editStates', async () => {
        await mousemove(mapContainer, {x: 380, y: 300}, {x: 400, y: 300});
        expect(marker.editState('selected')).toBe(false);
        // Hover detection runs asynchronously after the simulated mouse events.
        await vi.waitFor(() => {
            expect(marker.editState('hovered')).toBe(true);
        }, {timeout: 2000});
    });

    it('test selected editStates', async () => {
        marker.select();
        expect(marker.editState('selected')).toBe(true);
        expect(marker.editState('hovered')).toBe(true);
    });

    it('unhover and validate editStates', async () => {
        await mousemove(mapContainer, {x: 380, y: 300}, {x: 400, y: 280});
        expect(marker.editState('selected')).toBe(true);
        // Wait for hover detection to process the pointer leaving the marker.
        await vi.waitFor(() => {
            expect(marker.editState('hovered')).toBe(false);
        }, {timeout: 2000});
    });

    it('unselect and validate editStates', async () => {
        marker.unselect();
        expect(marker.editState('selected')).toBe(false);
        expect(marker.editState('hovered')).toBe(false);
    });

    it('get correct geo coordinates', async () => {
        chai.expect(marker.coord()).to.deep.almost([73.29398409, 19.27905288, 0]);
    });

    it('update feature and validate editState', async () => {
        marker.prop('test', 'test');
        expect(marker.editState('modified')).toBeGreaterThan(0);
    });

    it('remove feature and validate editState', async () => {
        marker.remove();
        expect(marker.editState('removed')).toBeGreaterThan(0);
    });
});
