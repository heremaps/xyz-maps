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
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {arch, platform} from 'node:os';
import type {CDPSession} from 'playwright';
import path from 'node:path';
import {defineConfig} from 'vitest/config';
import {project} from './vitest/projects.mts';
import {root, xyzShaderSources} from './vitest/plugins.mts';

const base = project('display', 'test');
const output = process.env.XYZ_BENCH_OUTPUT || 'dist/performance/buffers.json';
const suite = process.env.XYZ_BENCH_SUITE || 'buffers';
if (!['buffers', 'runtime'].includes(suite)) throw new Error(`Unknown XYZ_BENCH_SUITE: ${suite}`);
if (suite === 'runtime' && !['chrome', 'chromium'].includes(process.env.XYZ_BROWSER || 'chrome')) {
    throw new Error('XYZ_BENCH_SUITE=runtime requires Chromium CDP for heap measurements');
}
const scenario = process.env.XYZ_BENCH_SCENARIO || 'all';
if (!['all', 'legacy', 'matrices', 'rectangle-style-matrix', 'line-style-matrix', 'polygon-style-matrix', 'extrude-style-matrix',
    'text-style-matrix', 'icon-style-matrix', 'box-style-matrix', 'sphere-style-matrix', 'vertical-line-style-matrix',
    'heatmap-style-matrix', 'model-style-matrix', 'terrain-style-matrix', 'points', 'point-batches', 'style-batches', 'circle-color-batches', 'circle-width-batches', 'circle-style-matrix', 'rectangles', 'lines', 'dashed-lines', 'dynamic-lines',
    'lines-3d', 'polygons', 'polygon-outlines', 'extrudes', 'text', 'icons', 'boxes', 'spheres', 'vertical-lines',
    'heatmap', 'model', 'model-modes', 'clipped-models', 'terrain', 'mesh-terrain', 'mixed'].includes(scenario)) {
    throw new Error(`Unknown XYZ_BENCH_SCENARIO: ${scenario}`);
}
const warmupBatches = Number(process.env.XYZ_BENCH_WARMUP || 4);
if (!Number.isInteger(warmupBatches) || warmupBatches < 0) throw new Error('XYZ_BENCH_WARMUP must be a nonnegative integer');
const profiling = process.env.XYZ_BENCH_PROFILE === '1';
if (suite === 'runtime' && profiling) throw new Error('Runtime timings must not include construction profiling');
if (profiling && !['chrome', 'chromium'].includes(process.env.XYZ_BROWSER || 'chrome')) {
    throw new Error('XYZ_BENCH_PROFILE requires Chromium CDP');
}
const sourceRoot = process.env.XYZ_BENCH_DISPLAY_SOURCE;
let cdp: CDPSession;
let traceEvents: unknown[];

export default defineConfig({
    ...base,
    ...(sourceRoot ? {
        resolve: {
            ...base.resolve,
            alias: [
                {find: '../../display/src', replacement: path.resolve(sourceRoot)},
                {find: 'gl-matrix', replacement: path.resolve(root, '../display/node_modules/gl-matrix')},
                ...(Array.isArray(base.resolve!.alias) ? base.resolve!.alias
                    : Object.entries(base.resolve!.alias || {}).map(([find, replacement]) => ({find, replacement})))
            ]
        }
    } : {}),
    define: {
        ...base.define,
        __XYZ_BENCH_SCENARIO__: JSON.stringify(scenario),
        __XYZ_BENCH_WARMUP__: warmupBatches,
        __XYZ_BENCH_PROFILE__: profiling
    },
    plugins: [...base.plugins!, xyzShaderSources()],
    test: {
        ...base.test,
        name: 'buffer-performance',
        include: [suite === 'runtime' ? 'benchmarks/runtime.spec.ts' : 'benchmarks/buffers.spec.ts'],
        setupFiles: [],
        maxWorkers: 1,
        fileParallelism: false,
        testTimeout: 120000,
        browser: {
            ...base.test!.browser,
            commands: {
                async startBufferProfile({page}) {
                    cdp = await page.context().newCDPSession(page);
                    await cdp.send('Performance.enable');
                    await cdp.send('HeapProfiler.collectGarbage');
                    traceEvents = [];
                    cdp.on('Tracing.dataCollected', (event) => traceEvents.push(...event.value));
                    await cdp.send('HeapProfiler.startSampling', {
                        samplingInterval: 32768,
                        includeObjectsCollectedByMajorGC: true,
                        includeObjectsCollectedByMinorGC: true
                    });
                    await cdp.send('Profiler.enable');
                    await cdp.send('Profiler.setSamplingInterval', {interval: 100});
                    await cdp.send('Profiler.start');
                    await cdp.send('Tracing.start', {
                        categories: 'v8,devtools.timeline,blink.user_timing,disabled-by-default-v8.gc',
                        transferMode: 'ReportEvents'
                    });
                    return {
                        heap: await cdp.send('Runtime.getHeapUsage'),
                        metrics: await cdp.send('Performance.getMetrics')
                    };
                },
                async stopBufferProfile(_context, label: string) {
                    if (!cdp) throw new Error('Buffer profile was not started');
                    const heap = await cdp.send('Runtime.getHeapUsage');
                    const metrics = await cdp.send('Performance.getMetrics');
                    const {profile} = await cdp.send('HeapProfiler.stopSampling');
                    const {profile: cpuProfile} = await cdp.send('Profiler.stop');
                    const completed = new Promise<void>((resolve) => cdp.once('Tracing.tracingComplete', () => resolve()));
                    await cdp.send('Tracing.end');
                    await completed;
                    await cdp.send('HeapProfiler.collectGarbage');
                    const retainedHeap = await cdp.send('Runtime.getHeapUsage');
                    const prefix = path.resolve(output).replace(/\.json$/, '') + `-${label}`;
                    mkdirSync(path.dirname(prefix), {recursive: true});
                    writeFileSync(`${prefix}.heapprofile`, JSON.stringify(profile));
                    writeFileSync(`${prefix}.cpuprofile`, JSON.stringify(cpuProfile));
                    writeFileSync(`${prefix}.trace.json`, JSON.stringify({traceEvents}));
                    await cdp.detach();
                    return {heap, retainedHeap, metrics};
                },
                async measureBufferHeap({page}) {
                    const session = await page.context().newCDPSession(page);
                    try {
                        await session.send('HeapProfiler.collectGarbage');
                        return await session.send('Runtime.getHeapUsage');
                    } finally {
                        await session.detach();
                    }
                },
                async writeBufferBenchmark(_context, json: string) {
                    const report = {
                        schema: 1,
                        commit: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
                        dirty: !!execFileSync('git', ['status', '--porcelain'], {encoding: 'utf8'}).trim(),
                        node: process.version,
                        platform: platform(),
                        arch: arch(),
                        softwareRendering: process.env.XYZ_SOFTWARE_RENDERING === '1',
                        profiling,
                        displaySource: sourceRoot || 'workspace',
                        sourceCommit: process.env.XYZ_BENCH_SOURCE_COMMIT || null,
                        ...JSON.parse(json)
                    };
                    const file = path.resolve(output);
                    mkdirSync(path.dirname(file), {recursive: true});
                    writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
                    console.info(suite === 'runtime'
                        ? 'Runtime measurements include actual GL calls and GPU-completed wall time; see JSON for samples and retained heap.'
                        : 'Scenario | features | batches | buffers | draw groups | buffers by type | batches by type | draw groups by type | zIndex (batches/buffers/draws)');
                    for (const result of suite === 'runtime' ? [] : report.results) {
                        const {grouping} = result;
                        console.info(`${result.kind} | ${result.count} | ${grouping.batches} | ${grouping.buffers} | ${
                            grouping.drawGroups} | ${JSON.stringify(grouping.buffersByType)} | ${
                            JSON.stringify(grouping.batchesByType)} | ${JSON.stringify(grouping.drawGroupsByType)} | ${
                            Object.entries<{batches: number; buffers: number; drawGroups: number}>(grouping.byZIndex).map(([zIndex, partition]) =>
                                `${zIndex}:${partition.batches}/${partition.buffers}/${partition.drawGroups}`).join(',')}`);
                    }
                    console.info(`Buffer benchmark report: ${file}`);
                }
            }
        }
    }
});
