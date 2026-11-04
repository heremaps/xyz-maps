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
import {decompress} from '../../../core/src/loaders/webworker/decompress';

describe('worker decompression', () => {
    it.each(['gzip', 'deflate', 'deflate-raw'] as const)('roundtrips %s bytes and sliced buffers', async (format) => {
        for (const source of [new Uint8Array(), new Uint8Array([0, 255, 128, 226, 130, 172, 240, 159, 152, 128])]) {
            const stream = new Blob([source]).stream().pipeThrough(new CompressionStream(format));
            const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
            const buffer = new Uint8Array(compressed.length + 9).fill(99);
            buffer.set(compressed, 4);
            const original = buffer.slice();
            expect(await decompress(buffer.subarray(4, 4 + compressed.length), format)).toEqual(source);
            expect(buffer).toEqual(original);
            await expect(decompress(compressed.subarray(0, compressed.length - 1), format)).rejects.toThrow();
        }
    });

    it.each(['gzip', 'deflate', 'deflate-raw'] as const)('rejects malformed %s', async (format) => {
        await expect(decompress(new Uint8Array([255, 255, 255]), format)).rejects.toThrow();
        await expect(decompress(new Uint8Array(), format)).rejects.toThrow();
    });

    it('rejects invalid formats through the native API', async () => {
        // @ts-expect-error Exercise runtime validation for JavaScript callers.
        await expect(decompress(new Uint8Array(), 'zip')).rejects.toThrow();
    });

    it('rejects text instead of detecting or decoding it', async () => {
        // @ts-expect-error Exercise runtime validation for JavaScript callers.
        await expect(decompress('H4sI', 'gzip')).rejects.toThrow(TypeError);
    });
});
