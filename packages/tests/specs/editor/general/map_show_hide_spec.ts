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
import {createEditorFixture} from '@test/fixtures/editor';
import {drag} from 'triggerEvents';
import {beforeEach, describe, expect, it} from 'vitest';
import dataset from './map_show_hide_spec.json';

describe('map activate and deactivate', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 75.5553, latitude: 13.99646},
            zoomlevel: 18
        }));

        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -188912);
    });

    it('drag link shape point, validate link shape point', async function() {
        link.select();
        await drag(mapContainer, {x: 100, y: 100}, {x: 150, y: 100});

        expect(link.coord()).toEqualWithTolerance([
            [75.553958896, 13.997501028, 0],
            [75.554227116, 13.997501028, 0],
            [75.554227116, 13.997761284, 0]
        ], 1e-6);
    });

    it('deactivate editor', function() {
        editor.active(false);

        expect(editor.active()).toBe(false);
    });

    it('activate editor', function() {
        editor.active(false);
        editor.active(true);
        expect(editor.active()).toBe(true);

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).toHaveLength(1);
    });

    it('resumes shape editing after reactivation', async function() {
        link.select();
        await drag(mapContainer, {x: 100, y: 100}, {x: 150, y: 100});
        editor.active(false);
        editor.active(true);
        link.select();
        await drag(mapContainer, {x: 150, y: 100}, {x: 100, y: 100});

        expect(link.coord()).toEqualWithTolerance([
            [75.553690675, 13.997501028, 0],
            [75.554227116, 13.997501028, 0],
            [75.554227116, 13.997761284, 0]
        ], 1e-6);
    });
});
