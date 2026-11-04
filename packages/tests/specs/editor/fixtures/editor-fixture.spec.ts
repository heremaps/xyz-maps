/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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
import {createEditorFixture} from '@test/fixtures/editor';
import {describe, expect, it, onTestFinished, vi} from 'vitest';
import dataset from '../marker/marker-edit-states.json';

const mapOptions = {center: {longitude: 73.29398409, latitude: 19.27905288}, zoomlevel: 18};

describe('Editor fixture', () => {
    it('disposes the Editor, Map and prepared data automatically', async () => {
        let fixture: Awaited<ReturnType<typeof createEditorFixture>>;
        let clear: ReturnType<typeof vi.spyOn>;
        const order: string[] = [];
        onTestFinished(() => {
            expect(fixture.editor.destroy).toBeUndefined();
            expect(fixture.display.destroy).toBeUndefined();
            expect(clear).toHaveBeenCalledOnce();
            expect(order).toEqual(['editor', 'map', 'data']);
        });
        fixture = await createEditorFixture(dataset, mapOptions, {featureSelectionByDefault: false});
        const destroyEditor = fixture.editor.destroy.bind(fixture.editor);
        const destroyMap = fixture.display.destroy.bind(fixture.display);
        const clearData = fixture.preparedData.clear.bind(fixture.preparedData);
        const editorDestroy = vi.spyOn(fixture.editor, 'destroy').mockImplementation(() => {
            order.push('editor');
            editorDestroy.mockRestore();
            destroyEditor();
        });
        const mapDestroy = vi.spyOn(fixture.display, 'destroy').mockImplementation(() => {
            order.push('map');
            mapDestroy.mockRestore();
            destroyMap();
        });
        clear = vi.spyOn(fixture.preparedData, 'clear').mockImplementation(() => {
            order.push('data');
            return clearData();
        });

        expect(fixture.editor.config('featureSelectionByDefault')).toBe(false);
        expect(fixture.preparedData.getFeature('markerLayer', 'MyMarker')).toBeDefined();
    });

    it('does not share feature mutations and tolerates explicitly destroyed instances', async () => {
        const first = await createEditorFixture(dataset, mapOptions);
        const original = first.preparedData.getFeature('markerLayer', 'MyMarker');
        original.properties.fixtureMutation = true;
        first.editor.destroy();
        first.display.destroy();

        const second = await createEditorFixture(dataset, mapOptions);
        const fresh = second.preparedData.getFeature('markerLayer', 'MyMarker');

        expect(fresh).not.toBe(original);
        expect(fresh.properties).not.toHaveProperty('fixtureMutation');
        expect(second.editor).not.toBe(first.editor);
        expect(second.display).not.toBe(first.display);
    });
});
