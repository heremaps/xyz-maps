/*
 * Copyright (C) 2026 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
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
import {describe, expect, it} from 'vitest';
import {decodeTga} from '../../../core/src/loaders/webworker/decodeTga';

function tga(pixels: number[], width = 2, height = 1, depth = 24, descriptor = 0, type = 2, id: number[] = []) {
    return new Uint8Array([
        id.length, 0, type, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        width & 255, width >> 8, height & 255, height >> 8, depth, descriptor,
        ...id, ...pixels
    ]);
}

describe('worker TGA decoder', () => {
    it('decodes raw BGR pixels, skips image IDs, and respects subarray offsets', () => {
        const image = tga([3, 2, 1, 6, 5, 4], 2, 1, 24, 0, 2, [99, 98]);
        const buffer = new Uint8Array(image.length + 9);
        buffer.set(image, 5);
        const texture = decodeTga(buffer.subarray(5, 5 + image.length));
        expect(texture.width).toBe(2);
        expect(texture.height).toBe(1);
        expect(texture.flipY).toBe(false);
        expect(Array.from(texture.data)).toEqual([1, 2, 3, 255, 4, 5, 6, 255]);
    });

    it.each([0, 16, 32, 48])('normalizes both origins (descriptor %i) in pixels', (descriptor) => {
        const source = [];
        for (let row = 0; row < 2; row++) {
            for (let column = 0; column < 2; column++) {
                const x = descriptor & 16 ? 1 - column : column;
                const y = descriptor & 32 ? 1 - row : row;
                source.push(0, 0, 1 + y * 2 + x);
            }
        }
        const expected = [1, 2, 3, 4].reduce((pixels, r) => pixels.concat([r, 0, 0, 255]), [] as number[]);
        for (const type of [2, 10]) {
            const pixels = type == 10 ? [3, ...source] : source;
            expect(Array.from(decodeTga(tga(pixels, 2, 2, 24, descriptor, type)).data)).toEqual(expected);
        }
    });

    it.each([0, 8])('handles 32-bit alpha descriptor %i for raw and RLE', (alpha) => {
        for (const type of [2, 10]) {
            const pixels = type == 2 ? [3, 2, 1, 7, 3, 2, 1, 7] : [129, 3, 2, 1, 7];
            expect(Array.from(decodeTga(tga(pixels, 2, 1, 32, alpha, type)).data))
                .toEqual([1, 2, 3, alpha ? 7 : 255, 1, 2, 3, alpha ? 7 : 255]);
        }
    });

    it('decodes mixed raw and repeated RLE packets across rows', () => {
        const texture = decodeTga(tga([
            1, 0, 0, 1, 0, 0, 2,
            130, 0, 0, 3,
            0, 0, 0, 4
        ], 3, 2, 24, 0, 10));
        expect(Array.from(texture.data)).toEqual(
            [1, 2, 3, 3, 3, 4].reduce((pixels, r) => pixels.concat([r, 0, 0, 255]), [] as number[])
        );
    });

    it.each([0, 16, 32, 48])('splits RLE packets across multiple rows for origin %i', (origin) => {
        for (const depth of [24, 32]) {
            const descriptor = origin | (depth == 32 ? 8 : 0);
            const sourcePixel = (r: number) => depth == 32 ? [3, 2, r, 7] : [3, 2, r];
            // Raw and repeated packets end on, before, and after row boundaries.
            const packets = [
                0, ...sourcePixel(1),
                134, ...sourcePixel(2),
                3, ...[3, 4, 5, 6].flatMap(sourcePixel),
                129, ...sourcePixel(7),
                1, ...sourcePixel(8), ...sourcePixel(9)
            ];
            const values = [1, 2, 2, 2, 2, 2, 2, 2, 3, 4, 5, 6, 7, 7, 8, 9];
            const expected = new Array(64);
            values.forEach((r, pixel) => {
                const row = Math.floor(pixel / 4);
                const column = pixel % 4;
                const x = origin & 16 ? 3 - column : column;
                const y = origin & 32 ? 3 - row : row;
                expected.splice((y * 4 + x) * 4, 4, r, 2, 3, depth == 32 ? 7 : 255);
            });
            const image = tga(packets, 4, 4, depth, descriptor, 10, [98]);
            const buffer = new Uint8Array(image.length + 7);
            buffer.set(image, 3);
            expect(Array.from(decodeTga(buffer.subarray(3, 3 + image.length)).data)).toEqual(expected);
        }
    });

    it.each([1, 128])('decodes maximum and single-pixel repeated packets of length %i', (count) => {
        for (const origin of [0, 16, 32, 48]) {
            const texture = decodeTga(tga([128 + count - 1, 3, 2, 1], 1, count, 24, origin, 10));
            expect(Array.from(texture.data)).toEqual(
                Array.from({length: count}, () => [1, 2, 3, 255]).flat()
            );
        }
    });

    it('rejects truncated headers, IDs, pixels and packets', () => {
        const raw = tga([3, 2, 1, 6, 5, 4], 2, 1, 24, 0, 2, [99]);
        for (let length = 0; length < raw.length; length++) {
            expect(() => decodeTga(raw.subarray(0, length))).toThrow();
        }
        for (const pixels of [[], [129], [129, 3, 2], [1, 3, 2, 1], [128, 3, 2, 1]]) {
            expect(() => decodeTga(tga(pixels, 2, 1, 24, 0, 10))).toThrow(/Truncated/);
        }
    });

    it('rejects RLE overruns before reading packet pixels', () => {
        for (const packet of [2, 130]) {
            expect(() => decodeTga(tga([packet], 2, 1, 24, 0, 10))).toThrow(/exceeds/);
        }
    });

    it('rejects unsupported formats, descriptors and zero dimensions', () => {
        for (const [position, value] of [
            [1, 1], [2, 1], [2, 3], [2, 9], [16, 16], [16, 8],
            [17, 1], [17, 8], [17, 64], [17, 128], [12, 0], [14, 0]
        ]) {
            const bytes = tga([0, 0, 0], 1, 1);
            bytes[position] = value;
            expect(() => decodeTga(bytes)).toThrow();
        }
        for (const alpha of [1, 4, 7, 9, 15]) {
            expect(() => decodeTga(tga([0, 0, 0, 0], 1, 1, 32, alpha))).toThrow(/Unsupported/);
        }
    });
});
