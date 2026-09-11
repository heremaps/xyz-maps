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

// Run with node packages/tests/assets/tiles/generate-terrain-hill.cjs.
// Original deterministic Terrarium fixture: 1000 m border, 1300 m asymmetric summit.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const size = 512;
const raw = Buffer.alloc(size * (1 + size * 3));
let min = Infinity;
let max = -Infinity;
for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
        const u = x / (size - 1);
        const v = y / (size - 1);
        const r2 = ((u - 0.43) / (0.32 + 0.2 * (u - 0.43))) ** 2 + ((v - 0.48) / 0.38) ** 2;
        // Compact smooth bump: all derivatives vanish at its flat surrounding border.
        const height = 1000 + (r2 < 1 ? 300 * Math.exp(1 - 1 / (1 - r2)) : 0);
        const encoded = Math.round((height + 32768) * 256);
        const i = y * (1 + size * 3) + 1 + x * 3;
        raw[i] = encoded >>> 16;
        raw[i + 1] = (encoded >>> 8) & 255;
        raw[i + 2] = encoded & 255;
        const decoded = raw[i] * 256 + raw[i + 1] + raw[i + 2] / 256 - 32768;
        if ((x < 16 || y < 16 || x >= size - 16 || y >= size - 16) && decoded !== 1000) {
            throw new Error('Border is not flat');
        }
        min = Math.min(min, decoded);
        max = Math.max(max, decoded);
    }
}
function chunk(type, data) {
    const body = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of body) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const result = Buffer.alloc(data.length + 12);
    result.writeUInt32BE(data.length);
    body.copy(result, 4);
    result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
    return result;
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 2;
fs.writeFileSync(path.join(__dirname, 'terrain-hill.png'), Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
]));
console.log(`${size}x${size} RGB Terrarium: ${min}–${max} m; flat 16-pixel border verified`);
