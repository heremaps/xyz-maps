/*
 * Copyright (C) 2019-2025 HERE Europe B.V.
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

import {Feature, GeoJSONProvider, IMLProvider} from '@here/xyz-maps-core';
import dataset from './worker-preprocessor.json';
import {describe, it, expect} from 'vitest';

describe('GeoJSON worker preprocessor', function() {

    const createTileUrl = () => URL.createObjectURL(new Blob([
        JSON.stringify(dataset)
    ], {type: 'application/geo+json'}));

    const loadFeature = (provider: GeoJSONProvider) => new Promise<Feature>((resolve, reject) => {
        provider.getTile('0', (tile) => {
            if (tile.error) {
                reject(tile.error);
            } else {
                const feature = provider.getFeature('worker-feature');
                if (!feature) {
                    reject(new Error('Worker preprocessor did not load the feature'));
                    return;
                }
                resolve(feature);
            }
        });
    });

    it.each(['gzip', 'deflate', 'deflate-raw'] as const)('exposes byte utilities in the built %s worker', async (format) => {
        const url = createTileUrl();
        const provider = new GeoJSONProvider({
            level: 1,
            url,
            preProcessor: {
                execution: 'worker',
                options: {format},
                processor: async ({data}, {options, utils}) => {
                    const bytes = utils.decodeBase64('AP+A4oKs8J+YgA==');
                    const format = options.format;
                    if (format != 'gzip' && format != 'deflate' && format != 'deflate-raw') {
                        throw new Error('Invalid format');
                    }
                    const compressed = new Uint8Array(await new Response(
                        new Blob([bytes]).stream().pipeThrough(new CompressionStream(format))
                    ).arrayBuffer());
                    const padded = new Uint8Array(compressed.length + 4).fill(99);
                    padded.set(compressed, 2);
                    data[0].properties.bytes = await utils.decompress(padded.subarray(2, -2), format);
                    data[0].properties.unchanged = padded[0] == 99 && padded[2] == compressed[0];
                    return data;
                }
            }
        });
        try {
            const feature = await loadFeature(provider);
            expect(feature.properties.bytes).toBeInstanceOf(Uint8Array);
            expect(Array.from(feature.properties.bytes)).toEqual([0, 255, 128, 226, 130, 172, 240, 159, 152, 128]);
            expect(feature.properties.unchanged).toBe(true);
        } finally {
            provider.clear();
            URL.revokeObjectURL(url);
        }
    });

    it.each(['base64', 'compressed'])('routes invalid %s through tile errors', async (kind) => {
        const url = createTileUrl();
        const provider = new GeoJSONProvider({
            level: 1,
            url,
            preProcessor: {
                execution: 'worker',
                options: {kind},
                processor: async ({data}, {options, utils}) => {
                    if (options.kind == 'base64') utils.decodeBase64('!');
                    else await utils.decompress(new Uint8Array([255]), 'gzip');
                    return data;
                }
            }
        });
        try {
            await expect(loadFeature(provider)).rejects.toBeDefined();
        } finally {
            provider.clear();
            URL.revokeObjectURL(url);
        }
    });

    it('runs a serialized function and transfers prepared model assets', async () => {
        const url = createTileUrl();
        const provider = new GeoJSONProvider({
            level: 1,
            url,
            preProcessor: {
                execution: 'worker',
                options: {suffix: '-worker'},
                processor: async ({data, tile}, {options, utils}) => {
                    data[0].properties.workerResult = tile.quadkey + String(options.suffix);
                    data[0].properties.modelSource = {
                        format: 'obj',
                        obj: new Blob(['o model'], {type: 'text/plain'})
                    };
                    data[0].properties.vertices = new Float32Array([1, 2, 3]);
                    data[0].properties.texture = utils.decodeTga(new Uint8Array([
                        0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 32, 8,
                        3, 2, 1, 128
                    ]));
                    delete data[0].properties.objGzipBase64;
                    return data;
                }
            }
        });

        try {
            const feature = await loadFeature(provider);
            expect(feature.properties.workerResult).toBe('0-worker');
            expect(feature.properties.objGzipBase64).toBe(undefined);
            expect(await feature.properties.modelSource.obj.text()).toBe('o model');
            expect(Array.from(feature.properties.vertices)).toStrictEqual([1, 2, 3]);
            expect(feature.properties.texture.width).toBe(1);
            expect(feature.properties.texture.height).toBe(1);
            expect(feature.properties.texture.flipY).toBe(false);
            expect(feature.properties.texture.data).toBeInstanceOf(Uint8Array);
            expect(Array.from(feature.properties.texture.data)).toStrictEqual([1, 2, 3, 128]);
        } finally {
            provider.clear();
            URL.revokeObjectURL(url);
        }
    });

    it('loads an external module processor in the worker', async () => {
        const url = createTileUrl();
        const moduleUrl = URL.createObjectURL(new Blob([
            'export default ({data}, {options}) => { data[0].properties.moduleResult = options.value; return data; };'
        ], {type: 'text/javascript'}));
        const provider = new GeoJSONProvider({
            level: 1,
            url,
            preProcessor: {
                execution: 'worker',
                processor: moduleUrl,
                options: {value: 'module-worker'}
            }
        });

        try {
            const feature = await loadFeature(provider);
            expect(feature.properties.moduleResult).toBe('module-worker');
        } finally {
            provider.clear();
            URL.revokeObjectURL(url);
            URL.revokeObjectURL(moduleUrl);
        }
    });

    it('supplies default options and transfers decoded texture buffers out of the worker', async () => {
        const url = createTileUrl();
        const provider = new GeoJSONProvider({
            level: 1,
            url,
            preProcessor: {
                execution: 'worker',
                processor: ({data, tile}, {options, utils}) => {
                    const previous = (globalThis as any).previousTgaTexture;
                    const texture = utils.decodeTga(new Uint8Array([
                        0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 24, 0,
                        128, 3, 2, 1
                    ]));
                    (globalThis as any).previousTgaTexture = texture;
                    data[0].id = 'texture-' + tile.quadkey;
                    data[0].properties = {
                        texture,
                        emptyOptions: Object.keys(options).length == 0,
                        previousDetached: previous?.data.buffer.byteLength == 0
                    };
                    return data;
                }
            }
        });
        const load = (key: string) => new Promise<Feature>((resolve, reject) => {
            provider.getTile(key, (tile) => {
                if (tile.error) reject(tile.error);
                else resolve(provider.getFeature('texture-' + key));
            });
        });
        try {
            const first = await load('0');
            expect(first.properties.emptyOptions).toBe(true);
            expect(Array.from(first.properties.texture.data)).toStrictEqual([1, 2, 3, 255]);
            const second = await load('1');
            expect(second.properties.previousDetached).toBe(true);
            expect(Array.from(second.properties.texture.data)).toStrictEqual([1, 2, 3, 255]);
        } finally {
            provider.clear();
            URL.revokeObjectURL(url);
        }
    });

    it('preserves URL module processors while normalizing IML provider options', () => {
        const moduleUrl = URL.createObjectURL(new Blob([
            'export default ({data}) => data;'
        ], {type: 'text/javascript'}));
        const provider = new IMLProvider({
            level: 1,
            layer: 'models',
            catalog: 'hrn:here:data::example:catalog',
            credentials: {apiKey: 'test'},
            preProcessor: {
                execution: 'worker',
                processor: new URL(moduleUrl)
            }
        });

        provider.clear();
        URL.revokeObjectURL(moduleUrl);
    });
});
