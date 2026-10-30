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
import {prepare, TestData} from 'utils';
import {waitForEditorReady} from 'editorUtils';
import {Map} from '@here/xyz-maps-display';
import {Area, Editor} from '@here/xyz-maps-editor';
import {Feature} from '@here/xyz-maps-core';
import dataset from './area_transformer_spec.json';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

type Position = {mapX: number; mapY: number};
type Pixel = {x: number; y: number};

function handlers(feature: Feature) {
    const callbacks = '__' in feature ? feature.__ : feature;
    if (!callbacks || typeof callbacks !== 'object' ||
        !('pointerdown' in callbacks) || typeof callbacks.pointerdown !== 'function' ||
        !('pressmove' in callbacks) || typeof callbacks.pressmove !== 'function' ||
        !('pointerup' in callbacks) || typeof callbacks.pointerup !== 'function') {
        throw new Error('Missing transformer drag handlers');
    }
    const {pointerdown, pressmove, pointerup} = callbacks;
    return {
        down: (event: Position) => pointerdown.call(feature, event),
        move: (event: Position) => pressmove.call(feature, event),
        up: () => pointerup.call(feature)
    };
}

describe('scale box geometry', () => {
    let data: TestData;
    let display: Map;
    let editor: Editor;

    beforeEach(async () => {
        data = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 74.82185256187489, latitude: 12.901112606690091},
            zoomlevel: 19,
            layers: data.getLayers()
        });
        editor = new Editor(display, {layers: data.getLayers()});
        await waitForEditorReady(editor);
    });

    afterEach(async () => {
        editor.destroy();
        display.destroy();
        await data.clear();
    });

    const pixel = (coordinate: number[]): Pixel => display.geoToPixel(coordinate[0], coordinate[1]);

    it('preserves the grab offset, skips collapse and can scale again after mirroring', () => {
        const area = data.getFeature('buildingLayer', -9078);
        if (!(area instanceof Area)) throw new Error('Missing test area');
        area.transform();
        const handle = editor.getOverlay().search({rect: display.getViewBounds()})
            .find((feature) => feature.geometry.type === 'LineString' && feature.properties.index === 3);
        if (!handle) throw new Error('Missing left scale edge');
        const drag = handlers(handle);
        const original = JSON.parse(JSON.stringify(area.coord()));
        drag.down({mapX: 183, mapY: 400});
        drag.move({mapX: 383, mapY: 400});
        expect(area.coord()).toEqual(original);
        drag.move({mapX: 483, mapY: 400});
        drag.up();
        const mirrored = pixel(area.geometry.type === 'MultiPolygon' ?
            area.geometry.coordinates[0][0][0] : area.geometry.coordinates[0][0]);
        expect(mirrored.x).toEqualWithTolerance(500, 0.01);
        drag.down({mapX: 483, mapY: 400});
        drag.move({mapX: 453, mapY: 400});
        drag.up();
        const resized = pixel(area.geometry.type === 'MultiPolygon' ?
            area.geometry.coordinates[0][0][0] : area.geometry.coordinates[0][0]);
        expect(resized.x).toEqualWithTolerance(470, 0.01);
    });

    for (const angle of [0, 35, 90]) {
        for (const index of [0, 1, 2, 3]) {
            for (const scale of [0.7, -0.5]) {
                for (const steps of [1, 8]) {
                    it(`scales edge ${index} by ${scale} at ${angle} degrees with ${steps} moves and ignores repeats`, () => {
                        const area = data.getFeature('buildingLayer', -9078);
                        if (!(area instanceof Area)) throw new Error('Missing test area');
                        const ring = () => {
                            const geometry = area.geometry;
                            return geometry.type === 'MultiPolygon' ? geometry.coordinates[0][0] : geometry.coordinates[0];
                        };
                        area.transform();
                        const overlay = () => editor.getOverlay().search({rect: display.getViewBounds()});
                        if (angle) {
                            const knob = overlay().find((feature) => feature.properties.type === 'TRANSFORMER_ROTATE_KNOB');
                            if (!knob) throw new Error('Missing rotation knob');
                            const rotate = handlers(knob);
                            const start = pixel(knob.geometry.coordinates as number[]);
                            const points = ring().map(pixel);
                            const center = {x: (points[1].x + points[2].x) / 2, y: (points[1].y + points[2].y) / 2};
                            const radians = angle * Math.PI / 180;
                            const dx = start.x - center.x;
                            const dy = start.y - center.y;
                            rotate.down({mapX: start.x, mapY: start.y});
                            rotate.move({
                                mapX: center.x + dx * Math.cos(radians) - dy * Math.sin(radians),
                                mapY: center.y + dx * Math.sin(radians) + dy * Math.cos(radians)
                            });
                            rotate.up();
                        }

                        const original: Pixel[] = ring().map(pixel);
                        const corners = [
                            original[0], original[2],
                            {x: original[2].x + original[1].x - original[0].x,
                                y: original[2].y + original[1].y - original[0].y},
                            original[1]
                        ];
                        const opposite = corners[(index + 3) % 4];
                        const edge = corners[index];
                        const axis = {x: edge.x - opposite.x, y: edge.y - opposite.y};
                        const size = Math.hypot(axis.x, axis.y);
                        const unit = {x: axis.x / size, y: axis.y / size};
                        const expected = original.map((point) => {
                            const distance = (point.x - opposite.x) * unit.x + (point.y - opposite.y) * unit.y;
                            return {x: point.x + (scale - 1) * distance * unit.x,
                                y: point.y + (scale - 1) * distance * unit.y};
                        });
                        const handle = overlay().find((feature) => feature.geometry.type === 'LineString' &&
                            feature.properties.index === index);
                        if (!handle) throw new Error('Missing scale edge');
                        const coordinates = handle.geometry.coordinates as number[][];
                        const a = pixel(coordinates[0]);
                        const b = pixel(coordinates[1]);
                        const start = {mapX: (a.x + b.x) / 2, mapY: (a.y + b.y) / 2};
                        const drag = handlers(handle);
                        drag.down(start);
                        let end: Position;
                        for (let step = 1; step <= steps; step++) {
                            end = {mapX: start.mapX + (scale - 1) * axis.x * step / steps,
                                mapY: start.mapY + (scale - 1) * axis.y * step / steps};
                            drag.move(end);
                        }
                        expect(ring().map(pixel)).toEqualWithTolerance(expected, 0.01);
                        const once = JSON.parse(JSON.stringify(area.coord()));
                        for (let repeat = 0; repeat < 5; repeat++) drag.move(end);
                        expect(area.coord()).toEqual(once);
                        drag.up();
                    });
                }
            }
        }
    }
});
