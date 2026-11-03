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
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

const comparator = fileURLToPath(new URL('../../../benchmarks/compare.mjs', import.meta.url));

function report() {
    const byZIndex: Record<string, {batches: number; buffers: number; drawGroups: number}> = {
        '0': {batches: 1, buffers: 2, drawGroups: 2}
    };
    return {
        schema: 1, workload: 2, browser: 'chromium', platform: 'darwin', arch: 'arm64',
        backend: {renderer: 'SwiftShader', vendor: 'Google', version: 'WebGL2'},
        softwareRendering: true, samples: 2, warmupBatches: 4, buildsPerBatch: 8, profiling: false,
        results: [{
            kind: 'model', count: 128,
            grouping: {
                zGroups: 1, batches: 1, buffers: 2, drawGroups: 2,
                batchesByType: {Model: 1}, buffersByType: {Model: 2},
                drawGroupsByType: {Model: 2}, byZIndex
            },
            signature: {bytes: 128, shapes: [0, 2].map((descriptor) => ({
                type: 'Model', pass: 1, attributes: [
                    {name: 'a_position', descriptor, instanced: false, checksum: 42},
                    {name: 'a_modelMatrix', descriptor: 1, instanced: true, checksum: 1}
                ], groups: []
            })), batches: [{zIndex: '0', keys: [['M1', 0]]}]},
            samples: [
                {total: 3, build: 2, finalize: 1, release: 0.1},
                {total: 5, build: 3, finalize: 2, release: 0.2}
            ]
        }]
    };
}

describe('Buffer benchmark comparison', () => {
    let directory: string;
    beforeEach(() => {
        directory = mkdtempSync(join(tmpdir(), 'xyz-buffer-comparison-'));
    });
    afterEach(() => {
        rmSync(directory, {recursive: true});
    });
    const compare = (baseline: unknown, candidate: unknown, args: string[] = [], script: string = comparator) => {
        const before = join(directory, 'baseline.json');
        const after = join(directory, 'candidate.json');
        writeFileSync(before, JSON.stringify(baseline));
        writeFileSync(after, JSON.stringify(candidate));
        return spawnSync(process.execPath, [script, before, after, ...args], {encoding: 'utf8'});
    };

    it('prints unchanged grouping independently of improved timings', () => {
        const candidate = report();
        candidate.results[0].samples.forEach((sample) => {
            sample.total /= 2;
            sample.build /= 2;
            sample.finalize /= 2;
        });
        const result = compare(report(), candidate);
        expect(result.status).toBe(0);
        expect(result.stdout).toContain('model | 128 | 1 -> 1 | 2 -> 2 | 2 -> 2 | {"Model":2}');
        expect(result.stdout).toContain('model/128/total | 3.000 | 1.500 | -50.0%');
    });

    it('rejects changed buffer counts before printing performance', () => {
        const candidate = report();
        candidate.results[0].grouping.buffers = 3;
        const result = compare(report(), candidate);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('Grouping changed: model/128');
        expect(result.stdout).toBe('');
    });

    it('rejects changed zIndex partitions even when totals match', () => {
        const candidate = report();
        candidate.results[0].grouping.byZIndex = {'1': {batches: 1, buffers: 2, drawGroups: 2}};
        const result = compare(report(), candidate);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('Grouping changed');
    });

    it('rejects changed render-type counts even when totals match', () => {
        const candidate = report();
        candidate.results[0].grouping.buffersByType.Model = 1;
        const result = compare(report(), candidate);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('Grouping changed');
    });

    it('rejects changed batch keys with unchanged grouping totals', () => {
        const candidate = report();
        candidate.results[0].signature.batches[0].keys[0][0] = 'M2';
        const result = compare(report(), candidate);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('Workload/output changed: model/128');
    });

    it('allows explicit key-format changes without ignoring order or output changes', () => {
        const candidate = report();
        candidate.results[0].signature.batches[0].keys[0][0] = 'new-format';
        expect(compare(report(), candidate, ['--allow-key-format-change']).status).toBe(0);
        candidate.results[0].signature.shapes[0].pass = 2;
        expect(compare(report(), candidate, ['--allow-key-format-change']).status).not.toBe(0);
        candidate.results[0].signature.shapes[0].pass = 1;
        candidate.results[0].signature.batches[0].keys[0][1] = 1;
        expect(compare(report(), candidate, ['--allow-key-format-change']).status).not.toBe(0);
    });

    it('allows only explicit base model geometry sharing, retaining content and instance identity checks', () => {
        const candidate = report();
        candidate.results[0].signature.bytes = 96;
        candidate.results[0].signature.shapes[1].attributes[0].descriptor = 0;
        expect(compare(report(), candidate).status).not.toBe(0);
        expect(compare(report(), candidate, ['--allow-model-geometry-sharing']).status).toBe(0);
        candidate.results[0].signature.shapes[1].attributes[0].checksum++;
        expect(compare(report(), candidate, ['--allow-model-geometry-sharing']).status).not.toBe(0);
        candidate.results[0].signature.shapes[1].attributes[0].checksum--;
        candidate.results[0].signature.shapes[1].attributes[1].descriptor = 3;
        expect(compare(report(), candidate, ['--allow-model-geometry-sharing']).status).not.toBe(0);
    });

    it('rejects increased backing storage even with model sharing enabled', () => {
        const candidate = report();
        candidate.results[0].signature.bytes++;
        expect(compare(report(), candidate, ['--allow-model-geometry-sharing']).status).not.toBe(0);
    });

    it('validates later scenarios before printing any successful comparison', () => {
        const baseline = report();
        const candidate = report();
        baseline.results.push(report().results[0]);
        candidate.results.push(report().results[0]);
        candidate.results[1].signature.shapes[0].pass = 2;
        const result = compare(baseline, candidate);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('Workload/output changed');
        expect(result.stdout).toBe('');
    });

    it('rejects mixed profiled and unprofiled timings', () => {
        const candidate = report();
        candidate.profiling = true;
        const result = compare(report(), candidate);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('Do not compare profiled timings with normal benchmark timings');
    });

    it('rejects a different workload or warm-up', () => {
        for (const key of ['workload', 'warmupBatches'] as const) {
            const candidate = report();
            candidate[key]++;
            const result = compare(report(), candidate);
            expect(result.status).not.toBe(0);
            expect(result.stderr).toContain(`Incompatible benchmark metadata: ${key}`);
        }
    });

    it('rejects different actual construction backends despite identical browser and software flags', () => {
        const candidate = report();
        candidate.backend.renderer = 'Metal';
        const result = compare(report(), candidate);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('Incompatible benchmark metadata: backend');
        expect(result.stdout).toBe('');
    });

    const runtimeComparator = fileURLToPath(new URL('../../../benchmarks/compare-runtime.mjs', import.meta.url));
    const runtimeReport = () => ({
        schema: 1, workload: 'runtime-1', browser: 'chrome', backend: {renderer: 'Metal', vendor: 'Apple', version: 'WebGL2'},
        width: 256, height: 256, platform: 'darwin', arch: 'arm64', softwareRendering: false,
        profiling: false, samples: 2, warmupBatches: 4, framesPerBatch: 16,
        startup: {count: 64, samples: [0.1, 0.2], textures: {created: 2, deleted: 0},
            heap: {empty: {usedSize: 100, backingStorageSize: 0}, held: {usedSize: 200, backingStorageSize: 0}}},
        results: [{kind: 'model-shared', count: 64, buffers: 2, drawGroups: 2,
            calls: {uploads: 8, bytes: 1000, drawCalls: 2}, fingerprint: {hash: 123, colored: 500},
            samples: [{submit: 0.1, completed: 0.2}, {submit: 0.2, completed: 0.3}]}]
    });
    const compareRuntime = (candidate: ReturnType<typeof runtimeReport>, args: string[] = []) =>
        compare(runtimeReport(), candidate, args, runtimeComparator);

    it('compares actual rendering only with explicitly permitted model upload reductions', () => {
        const candidate = runtimeReport();
        candidate.results[0].calls.uploads = 6;
        candidate.results[0].calls.bytes = 750;
        expect(compareRuntime(candidate).status).not.toBe(0);
        expect(compareRuntime(candidate, ['--allow-model-geometry-sharing']).status).toBe(0);
        candidate.results[0].calls.bytes = 1001;
        expect(compareRuntime(candidate, ['--allow-model-geometry-sharing']).status).not.toBe(0);
    });

    it('rejects pixel and actual draw-count changes even with model sharing enabled', () => {
        for (const change of ['pixels', 'draws']) {
            const candidate = runtimeReport();
            if (change === 'pixels') candidate.results[0].fingerprint.hash++;
            else candidate.results[0].calls.drawCalls++;
            const result = compareRuntime(candidate, ['--allow-model-geometry-sharing']);
            expect(result.status).not.toBe(0);
            expect(result.stdout).toBe('');
        }
    });

    it('rejects different GPU backends, frame batch sizes and missing runtime samples', () => {
        const candidate = runtimeReport();
        candidate.backend.renderer = 'SwiftShader';
        expect(compareRuntime(candidate).status).not.toBe(0);
        candidate.backend.renderer = 'Metal';
        candidate.framesPerBatch++;
        expect(compareRuntime(candidate).status).not.toBe(0);
        candidate.framesPerBatch--;
        candidate.results[0].samples.pop();
        expect(compareRuntime(candidate).status).not.toBe(0);
    });
});
