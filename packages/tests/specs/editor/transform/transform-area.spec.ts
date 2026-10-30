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
import dataset from './transform-area.json';

describe('Transform Area', () => {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let area;

    beforeEach(async () => {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomlevel: 18
        }));
        mapContainer = display.getContainer();
        area = preparedData.getFeature('buildingLayer', '-9084');
    });

    it('scales, moves and rotates an area with the transformer', async () => {
        // scale area with transformer and validate its coordinates
        {
            area.transform();

            await drag(mapContainer, {x: 307 + 6, y: 260}, {x: 347 + 6, y: 260});

            expect(area.coord()).toEqualWithTolerance([[[
                [77.797698134, 12.622401739, 0],
                [77.796410675, 12.622244695, 0],
                [77.797054404, 12.621878261, 0],
                [77.797698134, 12.622401739, 0]
            ]]], 1e-6);
        }

        // move area with transformer and validate its coordinates
        {
            await drag(mapContainer, {x: 220, y: 300}, {x: 240, y: 350});

            expect(area.coord()).toEqualWithTolerance([[[
                [77.797805424, 12.622140021, 0],
                [77.796517995, 12.621982981, 0],
                [77.797161709, 12.621616554, 0],
                [77.797805424, 12.622140021, 0]
            ]]], 1e-6);
        }

        // rotate area with transformer and validate its coordinates
        {
            await drag(mapContainer, {x: 370, y: 410}, {x: 300, y: 450});

            expect(area.coord()).toEqualWithTolerance([[[
                [77.797844723, 12.621740971, 0],
                [77.796690092, 12.622318449, 0],
                [77.797010712, 12.62166197, 0],
                [77.797844723, 12.621740971, 0]
            ]]], 1e-6);
        }
    });
});
