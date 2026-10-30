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

import {triangulatePolygon} from '@here/xyz-maps-core';
import {describe, it, expect} from 'vitest';

function triangleArea(vertices: ArrayLike<number>, indices: number[], dimensions: number = 2): number {
    let area = 0;
    for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i] * dimensions;
        const b = indices[i + 1] * dimensions;
        const c = indices[i + 2] * dimensions;
        area += Math.abs(
            (vertices[b] - vertices[a]) * (vertices[c + 1] - vertices[a + 1]) -
            (vertices[c] - vertices[a]) * (vertices[b + 1] - vertices[a + 1])
        ) / 2;
    }
    return area;
}

describe('Triangulate polygon', () => {
    it('returns vertex indices for a triangle', () => {
        const vertices = [0, 0, 4, 0, 0, 3];
        const indices = triangulatePolygon(vertices);
        expect(indices.slice().sort()).toStrictEqual([0, 1, 2]);
        expect(triangleArea(vertices, indices)).toBe(6);
    });

    it('defaults to two-dimensional coordinates', () => {
        const vertices = [0, 0, 4, 0, 4, 4, 0, 4];
        const indices = triangulatePolygon(vertices);
        expect(indices).toHaveLength(6);
        expect(triangleArea(vertices, indices)).toBe(16);
    });

    it('excludes polygon holes using vertex offsets', () => {
        const vertices = [0, 0, 10, 0, 10, 10, 0, 10, 2, 2, 2, 8, 8, 8, 8, 2];
        const indices = triangulatePolygon(vertices, [4]);
        expect(indices).toHaveLength(24);
        expect(triangleArea(vertices, indices)).toBe(64);
    });

    it('honors the coordinate stride for three-dimensional vertices', () => {
        const vertices = [0, 0, 100, 4, 0, 200, 4, 4, 300, 0, 4, 400];
        const indices = triangulatePolygon(vertices, undefined, 3);
        expect(indices).toHaveLength(6);
        expect(triangleArea(vertices, indices, 3)).toBe(16);
    });

    it('accepts typed-array views without modifying the input', () => {
        const buffer = new Float32Array([99, 99, 0, 0, 4, 0, 4, 4, 0, 4, 99, 99]);
        const original = Array.from(buffer);
        const vertices = buffer.subarray(2, 10);
        const indices = triangulatePolygon(vertices);
        expect(indices).toHaveLength(6);
        expect(triangleArea(vertices, indices)).toBe(16);
        expect(Array.from(buffer)).toStrictEqual(original);
    });

    it('returns no triangles for empty coordinates', () => {
        expect(triangulatePolygon([])).toStrictEqual([]);
    });
});
