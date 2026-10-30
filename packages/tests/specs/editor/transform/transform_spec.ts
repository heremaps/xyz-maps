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
import {drag} from 'triggerEvents';
import {beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import dataset from './transform_spec.json';

describe('transform objects', () => {
    let editor;
    let display;
    let preparedData;
    let container;
    let mapContainer;
    let link;
    let address;

    beforeEach(async () => {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 77.81426220901494, latitude: 12.651311987215792},
            zoomlevel: 18
        }));
        mapContainer = display.getContainer();

        container = editor.createFeatureContainer();
        link = preparedData.getFeature('linkLayer', '-189186');
        address = preparedData.getFeature('paLayer', '-48037');

        container.push(link, address);
        container.transform();
    });

    it('transforms mixed features and preserves their editing state', async () => {
        // validate transformer is active
        {
            let overlay = editor.getOverlay();
            let features = overlay.search(display.getViewBounds());

            expect(features.length).toBeGreaterThanOrEqual(7);

            await userEvent.click(mapContainer, {position: {x: 100, y: 100}, modifiers: ['Alt']});

            features = overlay.search(display.getViewBounds());
            expect(features).toHaveLength(0);

            container.transform();
        }

        // drag right bar of transformer to scale
        {
            await drag(mapContainer, {x: 307 + 8, y: 280}, {x: 357 + 8, y: 280});
            expect(link.coord()).toEqualWithTolerance([[77.813993244, 12.651573696, 0], [77.812652884, 12.651416671, 0]], 1e-6);
            expect(address.coord()).toEqualWithTolerance([77.813323063, 12.651311987, 0], 1e-6);
        }

        // drag left bar of transformer to scale
        {
            await drag(mapContainer, {x: 92 - 5, y: 280}, {x: 120 - 5, y: 280});
            expect(link.coord()).toEqualWithTolerance([[77.813993987, 12.651573696, 0], [77.812803088, 12.651416671, 0]], 1e-6);
            expect(address.coord()).toEqualWithTolerance([77.813398537, 12.651311987, 0], 1e-6);
        }

        // drag top bar of transformer to scale
        {
            await drag(mapContainer, {x: 200, y: 241 - 8}, {x: 200, y: 220 - 8});
            expect(link.coord()).toEqualWithTolerance([[77.813993987, 12.651683614, 0], [77.812803088, 12.651460638, 0]], 1e-6);
            expect(address.coord()).toEqualWithTolerance([77.813398537, 12.651311987, 0], 1e-6);
        }

        // drag bottom bar of transformer to scale
        {
            await drag(mapContainer, {x: 200, y: 306 + 10}, {x: 200, y: 280 + 10});
            expect(link.coord()).toEqualWithTolerance([[77.813993987, 12.651683614, 0], [77.812803088, 12.651542291, 0]], 1e-6);
            expect(address.coord()).toEqualWithTolerance([77.813398537, 12.651448075, 0], 1e-6);
        }

        // drag the transformer to move the link and address
        {
            await drag(mapContainer, {x: 235 + 8, y: 250 + 8}, {x: 250 + 8, y: 280 + 8});
            expect(link.coord()).toEqualWithTolerance([[77.814074455, 12.651526574, 0], [77.812883572, 12.651385253, 0]], 1e-6);
            expect(address.coord()).toEqualWithTolerance([77.813479012, 12.651291038, 0], 1e-6);
        }

        // drag the transformer to rotate the link and address
        {
            await drag(mapContainer, {x: 370 + 8, y: 310 + 8}, {x: 300 + 8, y: 320 + 8});
            expect(link.coord()).toEqualWithTolerance([[77.814071297, 12.651276749, 0], [77.812926512, 12.651626708, 0]], 1e-6);
            expect(address.coord()).toEqualWithTolerance([77.813429285, 12.651301499, 0], 1e-6);
        }

        // scale and keep aspect ration
        {
            await drag(mapContainer, {x: 155, y: 195}, {x: 120, y: 160});
            expect(link.coord()).toEqualWithTolerance([[77.814286785, 12.651228703, 0], [77.812725497, 12.651705987, 0]], 1e-6);
            expect(address.coord()).toEqualWithTolerance([77.813411193, 12.651262458, 0], 1e-6);
        }

        // after transforming link validate it is not selected
        {
            let overlay = editor.getOverlay();
            let features = overlay.search(display.getViewBounds());
            expect(features.length).toBeGreaterThanOrEqual(7);
        }
    });
});
