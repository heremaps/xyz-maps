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
import {vi, describe, it, expect} from 'vitest';
import {expectCanvasPixelColor, getCanvasPixelColor} from 'utils';

describe('canvas pixel color sampling', () => {
    function canvasFixture() {
        const element = document.createElement('div');
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 1;
        element.appendChild(canvas);
        const context = canvas.getContext('2d');
        context.fillStyle = '#ff0000';
        context.fillRect(0, 0, 2, 1);
        return {element, context};
    }

    it('reads once without an expected color', async () => {
        const {element} = canvasFixture();
        expect(await getCanvasPixelColor(element, {x: 0, y: 0}, {delay: 0})).toBe('#ff0000');
    });

    it('rejects empty position lists for both sampling and assertions', async () => {
        const {element} = canvasFixture();
        await expect(getCanvasPixelColor(element, [], {delay: 0})).rejects.toThrow('Expected at least one pixel position');
        await expect(expectCanvasPixelColor(element, [], '#ff0000', {delay: 0}))
            .rejects.toThrow('Expected at least one pixel position');
    });

    it('reports a missing canvas for both sampling and assertions', async () => {
        const element = document.createElement('div');
        await expect(getCanvasPixelColor(element, {x: 0, y: 0}, {delay: 0}))
            .rejects.toThrow('Cannot read pixel colors: container has no canvas');
        await expect(expectCanvasPixelColor(element, {x: 0, y: 0}, '#ff0000', {delay: 0}))
            .rejects.toThrow('Cannot read pixel colors: container has no canvas');
    });

    it('reports unavailable rendering contexts for both sampling and assertions', async () => {
        const {element} = canvasFixture();
        const canvas = element.getElementsByTagName('canvas')[0];
        const getContext = vi.spyOn(canvas, 'getContext').mockReturnValue(null);
        try {
            await expect(getCanvasPixelColor(element, {x: 0, y: 0}, {delay: 0}))
                .rejects.toThrow('Cannot read pixel colors: no WebGL or Canvas2D context is available');
            await expect(expectCanvasPixelColor(element, {x: 0, y: 0}, '#ff0000', {delay: 0}))
                .rejects.toThrow('Cannot read pixel colors: no WebGL or Canvas2D context is available');
        } finally {
            getContext.mockRestore();
        }
    });

    it('returns the last sample when the retry budget is exhausted', async () => {
        const {element, context} = canvasFixture();
        const read = vi.spyOn(context, 'getImageData');
        try {
            const color = await getCanvasPixelColor(element, {x: 0, y: 0}, {
                expect: '#0000ff', retry: 2, delay: 0, retryDelay: 0
            });
            expect(color).toBe('#ff0000');
            expect(read.mock.calls.length).toBe(3);
        } finally {
            read.mockRestore();
        }
    });

    it('does not combine matching pixels from different samples', async () => {
        const {element, context} = canvasFixture();
        let reads = 0;
        const values = [[255, 0, 0], [255, 255, 255], [255, 255, 255], [0, 0, 255]];
        const read = vi.spyOn(context, 'getImageData').mockImplementation(() => {
            return new ImageData(new Uint8ClampedArray([...values[reads++], 255]), 1, 1);
        });
        try {
            const colors = await getCanvasPixelColor(element, [{x: 0, y: 0}, {x: 1, y: 0}], {
                expect: ['#ff0000', '#0000ff'], retry: 1, delay: 0, retryDelay: 0
            });
            expect(colors).toStrictEqual(['#ffffff', '#0000ff']);
            expect(reads).toBe(4);
        } finally {
            read.mockRestore();
        }
    });

    it('stops polling when the expected predicate matches', async () => {
        const {element, context} = canvasFixture();
        let samples = 0;
        const color = await getCanvasPixelColor(element, {x: 0, y: 0}, {
            delay: 0,
            retryDelay: 0,
            retry: 2,
            expect: (colors) => {
                samples++;
                if (colors[0] === '#0000ff') return true;
                context.fillStyle = '#0000ff';
                context.fillRect(0, 0, 2, 1);
                return false;
            }
        });
        expect(color).toBe('#0000ff');
        expect(samples).toBe(2);
    });

    it('asserts a single pixel or one color shared by multiple pixels', async () => {
        const {element} = canvasFixture();
        await expectCanvasPixelColor(element, {x: 0, y: 0}, '#ff0000', {delay: 0});
        await expectCanvasPixelColor(element, {x: 0, y: 0}, ['#ff0000'], {delay: 0});
        await expectCanvasPixelColor(element, [{x: 0, y: 0}, {x: 1, y: 0}], '#ff0000', {delay: 0});
    });

    it('asserts a different expected color for each position', async () => {
        const {element, context} = canvasFixture();
        context.fillStyle = '#0000ff';
        context.fillRect(1, 0, 1, 1);
        await expectCanvasPixelColor(element, [{x: 0, y: 0}, {x: 1, y: 0}], ['#ff0000', '#0000ff'], {delay: 0});
    });

    it('stops asserting after the first matching sample', async () => {
        const {element, context} = canvasFixture();
        let reads = 0;
        const read = vi.spyOn(context, 'getImageData').mockImplementation(() => {
            return new ImageData(new Uint8ClampedArray(++reads === 1 ? [255, 0, 0, 255] : [0, 0, 255, 255]), 1, 1);
        });
        try {
            await expectCanvasPixelColor(element, {x: 0, y: 0}, '#0000ff', {retry: 2, delay: 0, retryDelay: 0});
            expect(reads).toBe(2);
        } finally {
            read.mockRestore();
        }
    });

    it('reports the final colors and positions after exactly the configured retries', async () => {
        const {element, context} = canvasFixture();
        const read = vi.spyOn(context, 'getImageData');
        try {
            await expect(expectCanvasPixelColor(element, {x: 0, y: 0}, '#0000ff', {
                retry: 2, delay: 0, retryDelay: 0
            })).rejects.toMatchObject({
                actual: ['#ff0000'],
                expected: ['#0000ff'],
                message: expect.stringContaining('Canvas pixels at (0, 0)')
            });
            expect(read.mock.calls.length).toBe(3);
        } finally {
            read.mockRestore();
        }
    });

    it('fails when expected pixels only occur in separate samples', async () => {
        const {element, context} = canvasFixture();
        let reads = 0;
        const values = [[255, 0, 0], [255, 255, 255], [255, 255, 255], [0, 0, 255]];
        const read = vi.spyOn(context, 'getImageData').mockImplementation(() => {
            return new ImageData(new Uint8ClampedArray([...values[reads++], 255]), 1, 1);
        });
        try {
            await expect(expectCanvasPixelColor(element, [{x: 0, y: 0}, {x: 1, y: 0}], ['#ff0000', '#0000ff'], {
                retry: 1, delay: 0, retryDelay: 0
            })).rejects.toMatchObject({
                actual: ['#ffffff', '#0000ff'],
                expected: ['#ff0000', '#0000ff']
            });
            expect(reads).toBe(4);
        } finally {
            read.mockRestore();
        }
    });

    it('rejects mismatched position and color counts', async () => {
        const {element} = canvasFixture();
        await expect(expectCanvasPixelColor(element, [{x: 0, y: 0}, {x: 1, y: 0}], ['#ff0000'], {
            delay: 0
        })).rejects.toThrow('Expected one color per pixel position');
    });

    it('propagates sampling errors without retrying or replacing them', async () => {
        const {element, context} = canvasFixture();
        const error = new Error('Canvas sampling failed');
        const read = vi.spyOn(context, 'getImageData').mockImplementation(() => {
            throw error;
        });
        try {
            await expect(expectCanvasPixelColor(element, {x: 0, y: 0}, '#ff0000', {delay: 0})).rejects.toBe(error);
            expect(read.mock.calls.length).toBe(1);
        } finally {
            read.mockRestore();
        }
    });
});
