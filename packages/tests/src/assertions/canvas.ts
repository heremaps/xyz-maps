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

function backingScale() {
    if ('devicePixelRatio' in window) {
        if (window.devicePixelRatio > 1) {
            return window.devicePixelRatio;
        }
    }
    return 1;
}


type CanvasPixelPosition = {x: number, y: number};

interface CanvasPixelColorOptions {
    expect?: string | string[] | ((colors: string[]) => boolean);
    delay?: number;
    retry?: number;
    retryDelay?: number;
}

/**
 * Reads canvas pixels, optionally polling for an expected rendered result.
 * `expect` accepts a color for all positions, one color per position, or a predicate on the complete sample.
 * Every attempt reads all pixels afresh. Without `expect`, only one sample is taken.
 * Defaults: 100 ms initial delay, then up to 38 retries at 50 ms intervals when `expect` is supplied
 * (about two seconds, subject to scheduling). Explicit delay/retry options override these defaults.
 * Returns the last sample even if it does not match, so the caller's assertions report the actual colors.
 * Do not wrap calls in another polling loop.
 */
export async function getCanvasPixelColor(
    elem: HTMLElement,
    pos: CanvasPixelPosition | CanvasPixelPosition[],
    options: CanvasPixelColorOptions = {}): Promise<string | string[]> {
    const positions = Array.isArray(pos) ? pos : [pos];
    if (positions.length === 0) {
        throw new Error('Expected at least one pixel position');
    }
    const expected = options.expect;
    if (Array.isArray(expected) && expected.length !== positions.length) {
        throw new Error('Expected one color per pixel position');
    }
    const delay = options.delay ?? 100;
    const retryDelay = options.retryDelay ?? 50;
    const retry = options.retry ?? (expected === undefined ? 0 : 38);
    const scaleFactor = backingScale();
    const canvas = elem.getElementsByTagName('canvas')[0];
    if (!canvas) {
        throw new Error('Cannot read pixel colors: container has no canvas');
    }
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('2d');
    if (!context) {
        throw new Error('Cannot read pixel colors: no WebGL or Canvas2D context is available');
    }

    const getColor = (x: number, y: number) => {
        let pixel;
        if (context instanceof CanvasRenderingContext2D) {
            pixel = context.getImageData(x, y, 1, 1).data;
        } else {
            const gl = context;
            pixel = new Uint8Array(4);
            gl.readPixels(x * scaleFactor, canvas.height - y * scaleFactor, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        }
        return '#' + ('00000' + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6);
    };

    for (let attempt = 0; ; attempt++) {
        await new Promise<void>((resolve) => setTimeout(resolve, attempt === 0 ? delay : retryDelay));
        // Compare a complete fresh sample, never colors retained from different frames.
        const colors = positions.map(({x, y}) => getColor(x, y));
        const matches = typeof expected === 'function'
            ? expected(colors)
            : expected === undefined || colors.every((color, i) => color === (Array.isArray(expected) ? expected[i] : expected));
        if (matches || attempt >= retry) {
            return Array.isArray(pos) ? colors : colors[0];
        }
    }
}

/**
 * Waits for matching colors using the sampling helper's existing delay/retry budget.
 * Reports the complete last sample and pixel positions on failure, without an outer polling loop.
 */
export async function expectCanvasPixelColor(
    elem: HTMLElement,
    pos: CanvasPixelPosition | CanvasPixelPosition[],
    expected: string | string[],
    options: Omit<CanvasPixelColorOptions, 'expect'> = {}
): Promise<void> {
    const positions = Array.isArray(pos) ? pos : [pos];
    const colors = await getCanvasPixelColor(elem, pos, {...options, expect: expected});
    const actual = Array.isArray(colors) ? colors : [colors];
    const wanted = Array.isArray(expected) ? expected : positions.map(() => expected);
    const coordinates = positions.map(({x, y}) => `(${x}, ${y})`).join(', ');
    expect(actual, `Canvas pixels at ${coordinates}`).toStrictEqual(wanted);
}
