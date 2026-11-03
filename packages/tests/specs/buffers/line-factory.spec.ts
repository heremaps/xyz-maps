/*
 * Copyright (C) 2026 HERE Europe B.V.
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
import {afterEach, describe, expect, it, vi} from 'vitest';
import {GeoJSONCoordinate, Tile} from '@here/xyz-maps-core';
import {LineFactory} from '../../../display/src/displays/webgl/buffer/factory/LineFactory';
import {GLRender} from '../../../display/src/displays/webgl/GLRender';
import {HeightMapTileCache} from '../../../display/src/displays/webgl/HeightMapTileCache';

function withLineFactory(check: (factory: LineFactory, tile: Tile) => void) {
    const renderer = new GLRender({});
    renderer.init(document.createElement('canvas'), 1, new HeightMapTileCache());
    const factory = new LineFactory(renderer.device);
    const tile = new Tile('12222222222222', 'vector', true);
    vi.spyOn(tile, 'lon2x').mockImplementation((x) => x);
    vi.spyOn(tile, 'lat2y').mockImplementation((y) => y);
    try {
        check(factory, tile);
    } finally {
        renderer.destroy();
    }
}

afterEach(() => vi.restoreAllMocks());

describe('Reusable line projection storage', () => {
    it('does not reserve scratch bytes until a line needs projection', () => {
        withLineFactory((factory) => {
            factory.initTile();
            factory.initFeature(14, 256);
            for (const field of ['pixels', 'rotationZ', 'rotationY', 'lineLength'] as const) {
                expect(factory[field].byteLength).toBe(0);
            }
        });
    });

    for (const dimensions of [2, 3]) {
        it(`preserves every projected coordinate and cumulative length beyond the old ${dimensions}D limits`, () => {
            withLineFactory((factory, tile) => {
                const count = 132100;
                const coordinates: GeoJSONCoordinate[] = Array.from({length: count}, (_, i) =>
                    dimensions === 3 ? [10 + i % 200, i % 2 ? 20 : 30, i] : [10 + i % 200, i % 2 ? 20 : 30]);
                factory.initFeature(14, 256);
                expect(factory['projectLine'](coordinates, tile, 256)).toBe(count * dimensions);
                const pixels = factory['pixels'];
                const lengths = factory['lineLength'];
                expect(pixels.length).toBeGreaterThanOrEqual(count * dimensions);
                expect(lengths.length).toBeGreaterThanOrEqual(count);
                let distance = 0;
                let mismatch = -1;
                for (let i = 0; i < count; i++) {
                    const coordinate = coordinates[i];
                    if (i) {
                        const previous = coordinates[i - 1];
                        const dx = coordinate[0] - previous[0];
                        const dy = coordinate[1] - previous[1];
                        distance += Math.sqrt(dx * dx + dy * dy);
                    }
                    if (pixels[i * dimensions] !== coordinate[0] || pixels[i * dimensions + 1] !== coordinate[1] ||
                        dimensions === 3 && pixels[i * dimensions + 2] !== coordinate[2] ||
                        lengths[i] !== Math.fround(distance)) {
                        mismatch = i;
                        break;
                    }
                }
                expect(mismatch, 'first incomplete coordinate or cumulative length').toBe(-1);
                expect(factory['rotationZ'].length).toBeGreaterThanOrEqual(count);
                expect(factory['rotationY'].length).toBeGreaterThanOrEqual(count);
            });
        });
    }

    it('reuses capacity across smaller features, dimension changes and repeated styles', () => {
        withLineFactory((factory, tile) => {
            factory.initFeature(14, 256);
            factory['projectLine']([[1, 2, 3], [4, 6, 8]], tile, 256);
            const pixels = factory['pixels'];
            const lengths = factory['lineLength'];
            const rotationZ = factory['rotationZ'];
            const rotationY = factory['rotationY'];
            expect(pixels.byteLength + lengths.byteLength + rotationZ.byteLength + rotationY.byteLength).toBeLessThan(4096);
            expect(factory['projectLine']([[100, 100], [200, 200]], tile, 256)).toBe(6);
            expect(Array.from(pixels.subarray(0, 6))).toEqual([1, 2, 3, 4, 6, 8]);
            factory.initFeature(14, 256);
            expect(factory['projectLine']([[10, 20], [13, 24]], tile, 256)).toBe(4);
            expect(factory['pixels']).toBe(pixels);
            expect(factory['lineLength']).toBe(lengths);
            expect(factory['rotationZ']).toBe(rotationZ);
            expect(factory['rotationY']).toBe(rotationY);
            expect(Array.from(pixels.subarray(0, 4))).toEqual([10, 20, 13, 24]);
            expect(Array.from(lengths.subarray(0, 2))).toEqual([0, 5]);
        });
    });

    it('grows existing storage before projecting a larger feature and reuses it afterwards', () => {
        withLineFactory((factory, tile) => {
            factory.initFeature(14, 256);
            factory['projectLine']([[1, 2], [4, 6]], tile, 256);
            const pixels = factory['pixels'];
            const lengths = factory['lineLength'];
            factory.initFeature(14, 256);
            const coordinates: GeoJSONCoordinate[] = Array.from({length: 200}, (_, i) => [10 + i, 20, i]);
            expect(factory['projectLine'](coordinates, tile, 256)).toBe(600);
            const grownPixels = factory['pixels'];
            const grownLengths = factory['lineLength'];
            expect(grownPixels).not.toBe(pixels);
            expect(grownLengths).not.toBe(lengths);
            expect(Array.from(grownPixels.subarray(597, 600))).toEqual([209, 20, 199]);
            expect(grownLengths[199]).toBe(199);
            factory.initFeature(14, 256);
            expect(factory['projectLine']([[10, 20, 3], [13, 24, 8]], tile, 256)).toBe(6);
            expect(factory['pixels']).toBe(grownPixels);
            expect(factory['lineLength']).toBe(grownLengths);
            expect(Array.from(grownPixels.subarray(0, 6))).toEqual([10, 20, 3, 13, 24, 8]);
            expect(Array.from(grownLengths.subarray(0, 2))).toEqual([0, 5]);
        });
    });
});
