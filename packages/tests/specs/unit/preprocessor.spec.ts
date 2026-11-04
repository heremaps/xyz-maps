/*
 * Copyright (C) 2026 HERE Europe B.V.
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
import {describe, it, expect, vi} from 'vitest';
import {normalizePreProcessor} from '../../../core/src/providers/RemoteTileProvider/normalizePreProcessor';
import {createRemoteProcessor, executeProcessor} from '../../../core/src/providers/RemoteTileProvider/processors';
import type {PreProcessor, PreProcessorOptions} from '../../../core/src';

describe('preprocessor phases', () => {
    it('accepts the public main-thread contract in every configuration', () => {
        const sync: PreProcessor = ({data}) => data.map((feature) => feature);
        const promise: PreProcessor = async ({data}) => data;
        const callback: PreProcessor = ({data, ready, provider, tile}) => {
            expect(provider).toBeDefined();
            if (tile) expect(tile.quadkey).toBeDefined();
            ready(data);
        };
        const configurations: PreProcessorOptions[] = [
            sync, promise, callback, {main: [sync, promise, callback]},
            {execution: 'worker', processor: ({data}) => data}
        ];
        expect(configurations.map((config) => normalizePreProcessor(config).main.length))
            .toEqual([1, 1, 1, 3, 0]);
    });

    describe('processor execution', () => {
        it('preserves identity without processors and supports commit data', () => {
            const data = {put: [], remove: []};
            const ready = vi.fn();
            createRemoteProcessor(undefined, {} as any)(data, ready);
            expect(ready).toHaveBeenCalledExactlyOnceWith(data);
            executeProcessor(undefined);
            executeProcessor(null, {data, ready});
            expect(ready).toHaveBeenCalledTimes(2);
            createRemoteProcessor(({data}) => ({put: data.put}), {} as any)(data, ready);
            expect(ready).toHaveBeenLastCalledWith({put: data.put});
        });

        it('passes transformed data and provider/tile context through callback and Promise stages', async () => {
            const provider = {} as any;
            const tile = {x: 1, y: 2, z: 3, quadkey: '021'} as any;
            const order = [];
            const ready = vi.fn();
            await createRemoteProcessor([
                (input) => {
                    expect(input.provider).toBe(provider);
                    expect(input.tile).toEqual(tile);
                    order.push('callback');
                    input.ready([1]);
                },
                async (input) => {
                    expect(input.provider).toBe(provider);
                    expect(input.tile).toEqual(tile);
                    order.push('promise');
                    return [...input.data, 2];
                },
                ({data}) => {
                    order.push('return');
                    return [...data, 3];
                }
            ], provider)([], ready, tile);
            expect(order).toEqual(['callback', 'promise', 'return']);
            // Callback-only stages do not return their downstream Promise.
            await Promise.resolve();
            expect(ready).toHaveBeenCalledExactlyOnceWith([1, 2, 3]);
        });

        it.each(['return', 'resolve', 'reject'])('ignores %s after callback completion', async (completion) => {
            const ready = vi.fn();
            const onError = vi.fn();
            await executeProcessor(({ready}) => {
                ready([1]);
                ready([2]);
                if (completion === 'resolve') return Promise.resolve([3]);
                if (completion === 'reject') return Promise.reject(new Error('late'));
                return [3];
            }, {ready}, onError);
            expect(ready).toHaveBeenCalledExactlyOnceWith([1]);
            expect(onError).not.toHaveBeenCalled();
        });

        it.each([false, true])('surfaces unhandled processor failures (Promise: %s)', async (promise) => {
            const error = new Error('processor');
            const run = () => createRemoteProcessor([
                () => promise ? Promise.reject(error) : (() => {
                    throw error;
                })()
            ], {} as any)([], vi.fn());
            if (promise) await expect(run()).rejects.toBe(error);
            else expect(run).toThrow(error);
        });

        it.each(['callback', 'return', 'promise'])('does not swallow downstream ready errors after %s', async (completion) => {
            const error = new Error('ready');
            const onError = vi.fn();
            const run = () => createRemoteProcessor([
                ({data, ready}) => {
                    if (completion === 'callback') ready(data);
                    else if (completion === 'promise') return Promise.resolve(data);
                    else return data;
                }
            ], {} as any)([], () => {
                throw error;
            }, undefined, onError);
            if (completion === 'promise') await expect(run()).rejects.toBe(error);
            else expect(run).toThrow(error);
            expect(onError).not.toHaveBeenCalled();
        });

        it.each([false, true])('propagates next-stage errors without double-reporting (handler: %s)', (handler) => {
            const error = new Error('next');
            const onError = vi.fn(() => {
                throw error;
            });
            const run = () => createRemoteProcessor([
                ({data, ready}) => ready(data),
                () => {
                    throw error;
                }
            ], {} as any)([], vi.fn(), undefined, handler ? onError : undefined);
            expect(run).toThrow(error);
            expect(onError).toHaveBeenCalledTimes(handler ? 1 : 0);
        });

        it('surfaces errors from asynchronously invoked callbacks', () => {
            let complete;
            const error = new Error('async ready');
            const onError = vi.fn();
            createRemoteProcessor(({ready}) => {
                complete = ready;
            }, {} as any)([], () => {
                throw error;
            }, undefined, onError);
            expect(() => complete([])).toThrow(error);
            expect(onError).not.toHaveBeenCalled();
        });
    });
    it('normalizes optional phases and legacy forms', () => {
        const processor = ({data}) => data;
        expect(normalizePreProcessor({})).toEqual({worker: [], main: []});
        expect(normalizePreProcessor({worker: [], main: []})).toEqual({worker: [], main: []});
        expect(normalizePreProcessor(processor).main).toEqual([processor]);
        expect(normalizePreProcessor({execution: 'worker', processor}).worker[0].processor).toBe(processor);
        expect(normalizePreProcessor({worker: processor, main: processor}).worker).toEqual([{processor}]);
    });
    it('ignores extra keys and accepts structurally valid class instances', () => {
        const processor = ({data}) => data;
        class Options {
            enabled = true;
        }
        class Pipeline {
            worker = {processor, options: new Options(), extra: true};
            main = processor;
            extra = true;
        }
        const pipeline = new Pipeline();
        expect(normalizePreProcessor(pipeline)).toEqual({
            worker: [pipeline.worker], main: [processor]
        });
        const single = {execution: 'worker' as const, processor, extra: true};
        expect(normalizePreProcessor(single)).toEqual({
            worker: [{processor, options: undefined}], main: []
        });
        const extraOnly = {unknown: true};
        expect(normalizePreProcessor(extraOnly as PreProcessorOptions)).toEqual({worker: [], main: []});
    });
    it.each([
        null, [], 'module.js', {worker: [null]}, {main: ['module.js']},
        {worker: {processor: 1}}, {worker: {processor: 'module.js', options: []}},
        {execution: 'worker', processor: 'module.js', main: []},
        {execution: 'main', processor: () => []}, {worker: {execution: 'worker', processor: () => []}},
        {main: Array(1)}, {worker: Array(1)}, {worker: ''}, {worker: '   '},
        {worker: {processor: 'module.js', options: null}}, {main: false},
        {execution: 'worker', processor: 'module.js', worker: []}
    ])('rejects invalid config %j', (config) => {
        expect(() => normalizePreProcessor(config as any)).toThrow(/Invalid preProcessor/);
    });
    it('completes each callback/return/Promise stage only once in order', async () => {
        const order = [];
        await new Promise<void>((resolve, reject) => {
            createRemoteProcessor([
                ({data, ready}) => {
                    order.push(1); ready(data); return Promise.resolve(data);
                },
                ({data, ready}) => {
                    setTimeout(() => {
                        order.push(2); ready(data); ready(data);
                    }, 0);
                },
                async ({data}) => {
                    order.push(3); return data;
                }
            ], {} as any)([], () => {
                order.push(4); resolve();
            }, undefined, reject);
        });
        expect(order).toEqual([1, 2, 3, 4]);
    });
    it.each([false, true])('routes synchronous and asynchronous failures (%s)', async (asyncFailure) => {
        const failure = new Error('failure');
        await expect(new Promise((resolve, reject) => {
            createRemoteProcessor([
                ({data}) => data,
                () => {
                    if (asyncFailure) return Promise.reject(failure); throw failure;
                }
            ], {} as any)([], resolve, undefined, reject);
        })).rejects.toBe(failure);
    });
});
