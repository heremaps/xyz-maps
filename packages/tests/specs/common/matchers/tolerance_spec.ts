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

import {describe, it, expect} from 'vitest';

describe('absolute tolerance matcher', () => {
    const cases: {name: string; actual: unknown; expected: unknown; tolerance: number; pass: boolean}[] = [
        {name: 'equal numbers', actual: 1, expected: 1, tolerance: 0.125, pass: true},
        {name: 'inclusive boundary', actual: 0, expected: 0.125, tolerance: 0.125, pass: true},
        {name: 'outside boundary', actual: 0, expected: 0.126, tolerance: 0.125, pass: false},
        {name: 'negative numbers', actual: -1, expected: -1.125, tolerance: 0.125, pass: true},
        {name: 'nested coordinates', actual: [[1, 2]], expected: [[1.125, 2]], tolerance: 0.125, pass: true},
        {name: 'nested mismatch', actual: {point: [1, 2]}, expected: {point: [1.126, 2]}, tolerance: 0.125, pass: false},
        {name: 'strings', actual: {id: 'a'}, expected: {id: 'b'}, tolerance: 1, pass: false},
        {name: 'mixed fields', actual: {x: 0, id: 'a'}, expected: {x: 0.125, id: 'a'}, tolerance: 0.125, pass: true},
        {name: 'booleans', actual: {flag: true}, expected: {flag: false}, tolerance: 1, pass: false},
        {name: 'null and undefined', actual: null, expected: undefined, tolerance: 1, pass: false},
        {name: 'number and string', actual: 1, expected: '1', tolerance: 1, pass: false},
        {name: 'array lengths', actual: [1], expected: [1, 2], tolerance: 1, pass: false},
        {name: 'missing keys', actual: {x: 1}, expected: {x: 1, y: undefined}, tolerance: 1, pass: false},
        {name: 'NaN', actual: NaN, expected: NaN, tolerance: 1, pass: false},
        {name: 'infinity', actual: Infinity, expected: Infinity, tolerance: 1, pass: false},
        {name: 'signed zero', actual: 0, expected: -0, tolerance: 1, pass: true}
    ];

    for (const testCase of cases) {
        it(`preserves established tolerance behavior for ${testCase.name}`, () => {
            const {actual, expected, tolerance, pass} = testCase;
            const checkNative = () => expect(actual).toEqualWithTolerance(expected, tolerance);
            const checkNegated = () => expect(actual).not.toEqualWithTolerance(expected, tolerance);

            if (pass) {
                expect(checkNative).not.toThrow();
                expect(checkNegated).toThrow();
            } else {
                expect(checkNative).toThrow();
                expect(checkNegated).not.toThrow();
            }
        });
    }

    it('supports zero tolerance without changing ordinary equality', () => {
        expect([1, 2]).toEqualWithTolerance([1, 2], 0);
        expect([1, 2]).not.toEqualWithTolerance([1, 2.001], 0);
        expect([1, 2]).not.toEqual([1, 2.001]);
    });

    it('reports the absolute tolerance on failure', () => {
        expect(() => expect(0).toEqualWithTolerance(1, 0.125)).toThrow(/absolute tolerance of 0.125/);
    });

    it('supports asynchronous assertions', async () => {
        await expect(Promise.resolve([0])).resolves.toEqualWithTolerance([0.125], 0.125);
    });

    it('rejects invalid tolerances even when negated', () => {
        for (const tolerance of [-1, NaN, Infinity]) {
            expect(() => expect(0).toEqualWithTolerance(0, tolerance)).toThrow(TypeError);
            expect(() => expect(0).not.toEqualWithTolerance(0, tolerance)).toThrow(TypeError);
        }
    });
});
