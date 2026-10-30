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
import {AreaShape} from '@here/xyz-maps-editor';
import {createEditorFixture} from '@test/fixtures/editor';
import {editorClick, submit, waitForEditorReady} from 'editorUtils';
import {drag} from 'triggerEvents';
import {Listener} from 'utils';
import {beforeEach, describe, expect, it} from 'vitest';
import dataset from './area_edit_spec.json';

describe('modify area geometry', () => {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let areaLayer;
    let area;
    let areashp;

    beforeEach(async () => {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: -111.717195, latitude: 40.211738},
            zoomlevel: 18
        }));

        mapContainer = display.getContainer();

        area = preparedData.getFeature('buildingLayer', -9074);
        areaLayer = preparedData.getLayers('buildingLayer');
    });

    async function editExterior() {
        area.select();
        await drag(mapContainer, {x: 300, y: 300}, {x: 300, y: 250});
        const shape = (await editorClick(editor, 200, 500)).target;
        if (!(shape instanceof AreaShape)) throw new Error('Expected the exterior AreaShape at (200, 500)');
        shape.remove();
        await drag(mapContainer, {x: 400, y: 400}, {x: 450, y: 400});
    }

    it('persists exterior shape insertions and removal through submit', async () => {
        // get an area object and select
        {
            area.select();

            expect(area.coord()[0][0]).toHaveLength(5);
        }
        // drag a middle point to add shape point and validate
        {
            area.select();

            await drag(mapContainer, {x: 300, y: 300}, {x: 300, y: 250});

            expect(area.coord()).toEqualWithTolerance([[[
                [-111.718267489, 40.211738323, 0],
                [-111.718267489, 40.210918996, 0],
                [-111.717194605, 40.210918996, 0],
                [-111.717194605, 40.211738323, 0],
                [-111.717731047, 40.211943153, 0],
                [-111.718267489, 40.211738323, 0]
            ]]], 1e-6);
        }
        // click to remove a shape point and validate
        {
            areashp = (await editorClick(editor, 200, 500)).target;
            areashp.remove();

            expect(area.coord()).toEqualWithTolerance([[[
                [-111.718267489, 40.211738323, 0],
                [-111.717194605, 40.210918996, 0],
                [-111.717194605, 40.211738323, 0],
                [-111.717731047, 40.211943153, 0],
                [-111.718267489, 40.211738323, 0]
            ]]], 1e-6);
        }
        // drag middle point to add shape point again
        {
            await drag(mapContainer, {x: 400, y: 400}, {x: 450, y: 400});

            expect(area.coord()).toEqualWithTolerance([[[
                [-111.718267489, 40.211738323, 0],
                [-111.717194605, 40.210918996, 0],
                [-111.716926385, 40.21132866, 0],
                [-111.717194605, 40.211738323, 0],
                [-111.717731047, 40.211943153, 0],
                [-111.718267489, 40.211738323, 0]
            ]]], 1e-6);
        }
        // submit and validate coord
        {
            await waitForEditorReady(editor, async () => {
                await submit(editor);
            });

            let a = editor.getFeature(area.id, areaLayer);

            expect(a.coord()).toEqualWithTolerance([[[
                [-111.718267489, 40.211738323, 0],
                [-111.717194605, 40.210918996, 0],
                [-111.716926385, 40.21132866, 0],
                [-111.717194605, 40.211738323, 0],
                [-111.717731047, 40.211943153, 0],
                [-111.718267489, 40.211738323, 0]
            ]]], 1e-6);
        }
    });

    it('adds a hole to an edited exterior', async () => {
        await editExterior();
        // add a hole
        {
            area.addHole({x: 360, y: 370});

            expect(area.coord()).toEqualWithTolerance([[[
                [-111.718267489, 40.211738323, 0],
                [-111.717194605, 40.210918996, 0],
                [-111.716926385, 40.21132866, 0],
                [-111.717194605, 40.211738323, 0],
                [-111.717731047, 40.211943153, 0],
                [-111.718267489, 40.211738323, 0]
            ], [
                [-111.717575873, 40.211324241, 0],
                [-111.717575873, 40.211578232, 0],
                [-111.717243279, 40.211578232, 0],
                [-111.717243279, 40.211324241, 0],
                [-111.717575873, 40.211324241, 0]
            ]]], 1e-6);
        }
    });

    it('blocks an exterior drag through a hole', async () => {
        await editExterior(); area.addHole({x: 360, y: 370});
        // fire geometryValidation on blocked topologyViolation shape drag
        {
            area.select();
            const before = structuredClone(area.coord());
            const listener = new Listener(editor, ['geometryValidation']);
            // exterior intersects with hole
            await drag(mapContainer, {x: 400, y: 500}, {x: 400, y: 450});

            const results = listener.stop();

            expect((results.geometryValidation).length).toBeGreaterThan(0);
            expect(results.geometryValidation[0]).toEqual(expect.objectContaining({
                type: 'geometryValidation',
                target: area
            }));
            expect(results.geometryValidation[0].detail.geometryValidation).toEqual(expect.objectContaining({
                valid: false,
                reason: 'topologyViolation',
                operation: 'shapeMove',
                blocked: true,
                polygonIndex: 0,
                lineStringIndex: 0,
                coordinateIndex: 1
            }));
            // Valid intermediate moves may precede the rejected step; undo restores the entire drag.
            editor.undo();
            expect(editor.getFeature(area.id, areaLayer).coord()).toEqual(before);
        }
    });

    it('blocks a self-intersecting exterior drag', async () => {
        await editExterior(); area.addHole({x: 360, y: 370});
        // fire geometryValidation on blocked self-intersecting shape drag
        {
            area.select();
            const before = structuredClone(area.coord());
            const listener = new Listener(editor, ['geometryValidation']);

            await drag(mapContainer, {x: 300, y: 250}, {x: 450, y: 320});

            const results = listener.stop();
            expect((results.geometryValidation).length).toBeGreaterThan(0);
            expect(results.geometryValidation[0]).toEqual(expect.objectContaining({
                type: 'geometryValidation',
                target: area
            }));
            expect(results.geometryValidation[0].detail.geometryValidation).toEqual(expect.objectContaining({
                valid: false,
                reason: 'selfIntersection',
                operation: 'shapeMove',
                blocked: true,
                polygonIndex: 0,
                lineStringIndex: 0,
                coordinateIndex: 4
            }));
            editor.undo();
            expect(editor.getFeature(area.id, areaLayer).coord()).toEqual(before);
        }
    });
});
