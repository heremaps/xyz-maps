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
