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
import {decodeBase64} from '../../../core/src/loaders/webworker/decodeBase64';

describe('worker base64 decoder', () => {
    it('rejects non-string inputs without coercion', () => {
        // @ts-expect-error Exercise runtime validation for JavaScript callers.
        expect(() => decodeBase64(123)).toThrow(TypeError);
    });
    it.each([
        ['', []],
        ['Zg==', [102]],
        ['Zm8=', [102, 111]],
        ['Zm9v', [102, 111, 111]],
        [' Zm\t8=\r\n', [102, 111]],
        ['Zg', [102]],
        ['Zm8', [102, 111]],
        ['AP+A4oKs8J+YgA==', [0, 255, 128, 226, 130, 172, 240, 159, 152, 128]]
    ])('decodes %j without interpreting text', (encoded, expected) => {
        const result = decodeBase64(encoded);
        expect(result).toBeInstanceOf(Uint8Array);
        expect(Array.from(result)).toEqual(expected);
    });

    it.each(['A', 'Zg=', 'Zg===', '=Zg=', 'Zm=8', 'Zm8==', 'Zm8!', '-_8=', 'é', '\u00a0Zg=='])(
        'rejects invalid base64 %j',
        (encoded) => expect(() => decodeBase64(encoded)).toThrow()
    );
});
