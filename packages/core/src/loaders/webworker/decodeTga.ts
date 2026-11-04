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
import type {ModelTextureData} from '../../styles/ModelStyle';

const littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] == 1;
const redShift = littleEndian ? 0 : 24;
const greenShift = littleEndian ? 8 : 16;
const blueShift = littleEndian ? 16 : 8;
const alphaShift = littleEndian ? 24 : 0;

/**
 * Decode uncompressed or RLE truecolor TGA bytes into bottom-to-top RGBA rows.
 * Typed-array WebGL uploads do not apply UNPACK_FLIP_Y_WEBGL, so orientation
 * is normalized in the pixels themselves.
 */
export function decodeTga(bytes: Uint8Array): ModelTextureData {
    if (!(bytes instanceof Uint8Array) || bytes.length < 18) {
        throw new Error('Invalid TGA header');
    }
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = header.getUint16(12, true);
    const height = header.getUint16(14, true);
    // TGA image type: 2 = raw truecolor, 10 = RLE truecolor.
    const type = bytes[2];
    const depth = bytes[16];
    // Bits 0-3: alpha depth; bit 4: right origin; bit 5: top origin; bits 6-7: interleaving.
    const descriptor = bytes[17];
    const alpha = descriptor & 15;
    if (!width || !height) {
        throw new Error('Invalid TGA dimensions');
    }
    if (bytes[1] != 0 || (type != 2 && type != 10) ||
        (depth != 24 && depth != 32) || (descriptor & 192) ||
        (alpha != 0 && !(depth == 32 && alpha == 8))) {
        throw new Error('Unsupported TGA format');
    }

    const pixelSize = depth / 8;
    const pixelCount = width * height;
    let offset = 18 + bytes[0];
    const requireBytes = (count: number) => {
        if (offset + count > bytes.length) {
            throw new Error('Truncated TGA data');
        }
    };
    requireBytes(0);
    // Check raw input size before allocating the output.
    if (type == 2) requireBytes(pixelCount * pixelSize);
    const data = new Uint8Array(pixelCount * 4);
    const words = new Uint32Array(data.buffer);
    const readPixel = (source: number) =>
        (bytes[source + 2] << redShift) | (bytes[source + 1] << greenShift) |
        (bytes[source] << blueShift) | ((alpha == 8 ? bytes[source + 3] : 255) << alphaShift);
    const step = descriptor & 16 ? -1 : 1;
    const rowStep = descriptor & 32 ? -width : width;
    let rowStart = descriptor & 32 ? pixelCount - width : 0;
    let column = 0;
    let pixel = 0;
    while (pixel < pixelCount) {
        let count = pixelCount;
        let repeated = false;
        if (type == 10) {
            requireBytes(1);
            const packet = bytes[offset++];
            count = (packet & 127) + 1;
            repeated = !!(packet & 128);
            if (count > pixelCount - pixel) {
                throw new Error('TGA RLE packet exceeds image dimensions');
            }
        }
        if (type == 10) requireBytes((repeated ? 1 : count) * pixelSize);
        const color = repeated ? readPixel(offset) : 0;
        if (repeated) offset += pixelSize;
        pixel += count;
        while (count) {
            const length = Math.min(count, width - column);
            let target = rowStart + (step == 1 ? column : width - 1 - column);
            if (repeated) {
                const start = step == 1 ? target : target - length + 1;
                words.fill(color, start, start + length);
            } else {
                for (let i = 0; i < length; i++) {
                    words[target] = readPixel(offset);
                    target += step;
                    offset += pixelSize;
                }
            }
            count -= length;
            column += length;
            if (column == width) {
                column = 0;
                rowStart += rowStep;
            }
        }
    }
    return {width, height, data, flipY: false};
}
