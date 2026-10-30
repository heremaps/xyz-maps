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
import {createEditorFixture} from 'editorUtils';
import {mousemove} from 'triggerEvents';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import dataset from './marker-edit-states.json';

describe('Marker edit states', () => {
    let editor;
    let display;
    let preparedData;
    let marker;
    let mapContainer;

    beforeEach(async () => {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 73.29398409, latitude: 19.27905288},
            zoomlevel: 18
        }));

        mapContainer = display.getContainer();

        marker = preparedData.getFeature('markerLayer', 'MyMarker');
    });

    it('starts unselected and unhovered', async () => {
        expect(marker.editState('selected')).toBe(false);
        expect(marker.editState('hovered')).toBe(false);
    });

    it('marks a hovered marker without selecting it', async () => {
        await mousemove(mapContainer, {x: 380, y: 300}, {x: 400, y: 300});
        expect(marker.editState('selected')).toBe(false);
        // Hover detection runs asynchronously after the simulated mouse events.
        await vi.waitFor(() => {
            expect(marker.editState('hovered')).toBe(true);
        }, {timeout: 2000});
    });

    it('preserves hover when the marker is selected', async () => {
        await mousemove(mapContainer, {x: 380, y: 300}, {x: 400, y: 300});
        await vi.waitFor(() => {
            expect(marker.editState('hovered')).toBe(true);
        }, {timeout: 2000});
        marker.select();
        expect(marker.editState('selected')).toBe(true);
        expect(marker.editState('hovered')).toBe(true);
    });

    it('preserves selection when the pointer leaves', async () => {
        marker.select();
        await mousemove(mapContainer, {x: 380, y: 300}, {x: 400, y: 300});
        await vi.waitFor(() => {
            expect(marker.editState('hovered')).toBe(true);
        }, {timeout: 2000});
        await mousemove(mapContainer, {x: 380, y: 300}, {x: 400, y: 280});
        expect(marker.editState('selected')).toBe(true);
        // Wait for hover detection to process the pointer leaving the marker.
        await vi.waitFor(() => {
            expect(marker.editState('hovered')).toBe(false);
        }, {timeout: 2000});
    });

    it('clears selection without introducing hover', async () => {
        marker.select();
        marker.unselect();
        expect(marker.editState('selected')).toBe(false);
        expect(marker.editState('hovered')).toBe(false);
    });

    it('returns the configured geographic coordinates', async () => {
        expect(marker.coord()).toEqualWithTolerance([73.29398409, 19.27905288, 0], 1e-6);
    });

    it('marks property changes as modified', async () => {
        marker.prop('test', 'test');
        expect(marker.editState('modified')).toBeGreaterThan(0);
    });

    it('marks the marker as removed', async () => {
        marker.remove();
        expect(marker.editState('removed')).toBeGreaterThan(0);
    });
});
