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
import {expect} from 'vitest';

declare module 'vitest' {
    interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
        toEqualWithTolerance(expected: T, tolerance: number): R;
    }
}

expect.extend({
    toEqualWithTolerance(received: unknown, expected: unknown, tolerance: number) {
        if (typeof tolerance !== 'number' || !Number.isFinite(tolerance) || tolerance < 0) {
            throw new TypeError('Tolerance must be a finite non-negative number.');
        }

        const numbersEqual = (actual: unknown, wanted: unknown): boolean | undefined => {
            if (typeof actual === 'number' && typeof wanted === 'number') {
                return Math.abs(actual - wanted) <= tolerance;
            }
        };
        const pass = this.equals(
            received,
            expected,
            [numbersEqual, ...this.customTesters, this.utils.iterableEquality],
            true
        );

        return {
            pass,
            actual: received,
            expected,
            message: () => `expected ${this.utils.printReceived(received)} ${this.isNot ? 'not ' : ''}` +
                `to equal ${this.utils.printExpected(expected)} with an absolute tolerance of ${tolerance}`
        };
    }
});
