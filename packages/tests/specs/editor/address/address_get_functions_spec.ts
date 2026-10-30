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
import {vi, describe, beforeAll, afterAll, it, expect} from 'vitest';
import {mousemove} from 'triggerEvents';
import {Editor} from '@here/xyz-maps-editor';
import {Map} from '@here/xyz-maps-display';
import dataset from './address_get_functions_spec.json';

describe('Address get functions', function() {
    var editor;
    var display;
    var preparedData;
    var link;
    var address;
    var mapContainer;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.26398409, latitude: 19.20905288},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await waitForEditorReady(editor);

        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -188821);
        address = preparedData.getFeature('paLayer', -47935);
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });


    it('get editstates', async function() {
        expect(address.editState('selected')).toBe(false);
        expect(address.editState('hovered')).toBe(false);

        // hover address
        await mousemove(mapContainer, {x: 180, y: 100}, {x: 200, y: 100});
        expect(address.editState('selected')).toBe(false);
        // Hover detection completes asynchronously after the simulated movement.
        await vi.waitFor(() => {
            expect(address.editState('hovered')).toBe(true);
        }, {timeout: 2000});

        // select address
        address.select();
        expect(address.editState('selected')).toBe(true);
        expect(address.editState('hovered')).toBe(true);

        // leave address
        await mousemove(mapContainer, {x: 180, y: 100}, {x: 200, y: 80});
        expect(address.editState('selected')).toBe(true);
        await vi.waitFor(() => {
            expect(address.editState('hovered')).toBe(false);
        }, {timeout: 2000});

        // unselect address
        address.unselect();
        expect(address.editState('selected')).toBe(false);
        expect(address.editState('hovered')).toBe(false);
    });

    it('get correct geoCoordinates, pixel coordinate', async function() {
        expect(address.coord()).toEqualWithTolerance([73.262911206, 19.210066027, 0], 1e-6);
        expect(address.prop()).toEqual(expect.objectContaining({
            'routingLink': link.id + '',
            'routingPoint': [73.26291, 19.20981, 0],
            'housenumber': '180a',
            'roadname': 'test street'
        }));
        expect(address.getLink()).toEqual(expect.objectContaining({
            'id': link.id
        }));
    });
});
