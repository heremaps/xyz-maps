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
import {userEvent} from 'vitest/browser';
import dataset from './address_setcoordinates_spec.json';

describe('add Address layer set coordinates', function() {
    var preparedData;
    let editor;
    let display;
    let address;
    let addrLayer;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 75.573482, latitude: 12.950542},
            zoomlevel: 18
        }));

        preparedData.getFeature('linkLayer', -188828);
        address = preparedData.getFeature('paLayer', -47939);

        addrLayer = preparedData.getLayers('paLayer');
    });

    it('sets Address coordinates through the API', async () => {
        // verify address has correct geo coordinate then modify its geo coordinate
        {
            expect(address.coord()).toEqualWithTolerance([
                75.572408633, 12.951587932, 0
            ], 1e-6);

            address.coord([75.573481516, 12.950542341, 0]);
        }
        // verify address has correct geo coordinate
        {
            expect(address.coord()).toEqualWithTolerance([
                75.573481516, 12.950542341, 0
            ], 1e-6);
        }
    });

    it('accepts coordinates at the original Address location', async () => {
        // modify and verify address has correct geo coordinate
        {
            address.coord([75.572408632, 12.9515879324, 0]);

            expect(address.coord()).toEqualWithTolerance([
                75.572408632, 12.951587932, 0
            ], 1e-6);
        }
    });

    it('finds the Address and its link in the viewport', async () => {
        // validate objects in viewport
        {
            let objs1 = editor.search({rect: display.getViewBounds(), layers: [addrLayer]});
            let objs2 = editor.search({rect: display.getViewBounds()});

            expect(objs1).toHaveLength(1);
            expect(objs2).toHaveLength(2);
        }
    });

    it('preserves a dragged Address when its layer is removed and re-added', async () => {
        // drag the address, remove the address layer and validate modified address in viewport
        {
            let mapContainer = display.getContainer();
            await userEvent.click(mapContainer, {position: {x: 200, y: 100}, modifiers: ['Alt']});
            await drag(mapContainer, {x: 200, y: 100}, {x: 200, y: 150});

            editor.removeLayer(addrLayer);

            let objs1 = editor.search({rect: display.getViewBounds(), layers: [addrLayer]});
            let objs2 = editor.search({rect: display.getViewBounds()});

            expect(objs1).toHaveLength(1);
            expect(objs2).toHaveLength(1);
        }
        // add Address layer, verify address has correct geo coordinate
        {
            editor.addLayer(addrLayer);

            expect(address.coord()).toEqualWithTolerance([
                75.572408633, 12.951326536, 0
            ], 1e-6);
        }
    });
});
