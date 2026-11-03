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
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';

const args = process.argv.slice(2);
const allowSharing = args.includes('--allow-model-geometry-sharing');
const files = args.filter((arg) => arg !== '--allow-model-geometry-sharing');
if (files.length !== 2) throw new Error('Usage: node benchmarks/compare-runtime.mjs baseline.json candidate.json [--allow-model-geometry-sharing]');
const [baseline, candidate] = files.map((file) => JSON.parse(readFileSync(file, 'utf8')));
for (const key of ['schema', 'workload', 'browser', 'backend', 'width', 'height', 'platform', 'arch',
    'softwareRendering', 'profiling', 'samples', 'warmupBatches', 'framesPerBatch']) {
    if (!isDeepStrictEqual(baseline[key], candidate[key])) throw new Error(`Incompatible runtime metadata: ${key}`);
}
if (baseline.workload !== 'runtime-1') throw new Error('Expected runtime-1 workload');
if (baseline.results.length !== candidate.results.length || baseline.startup.count !== candidate.startup.count) {
    throw new Error('Runtime scenario/count changed');
}
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)];
const timing = (label, before, after) => {
    if (!before.length || !after.length || [...before, ...after].some((value) => !Number.isFinite(value) || value < 0)) {
        throw new Error(`Invalid timings: ${label}`);
    }
    console.log(`${label} | ${percentile(before, 0.5).toFixed(3)} -> ${percentile(after, 0.5).toFixed(3)} ms | ${
        percentile(before, 0.1).toFixed(3)}..${percentile(before, 0.9).toFixed(3)} -> ${
        percentile(after, 0.1).toFixed(3)}..${percentile(after, 0.9).toFixed(3)}`);
};
baseline.results.forEach((before, index) => {
    const after = candidate.results[index];
    for (const key of ['kind', 'count', 'buffers', 'drawGroups', 'fingerprint']) {
        if (!isDeepStrictEqual(before[key], after[key])) throw new Error(`Runtime output changed: ${before.kind}/${key}`);
    }
    if (before.calls.drawCalls !== after.calls.drawCalls) throw new Error(`Draw-call count changed: ${before.kind}`);
    for (const metric of ['uploads', 'bytes']) {
        if (allowSharing && before.kind === 'model-shared') {
            if (after.calls[metric] > before.calls[metric]) throw new Error(`Model uploads increased: ${metric}`);
        } else if (before.calls[metric] !== after.calls[metric]) {
            throw new Error(`Geometry uploads changed: ${before.kind}/${metric}`);
        }
    }
    if (before.samples.length !== baseline.samples || after.samples.length !== candidate.samples) {
        throw new Error(`Missing runtime samples: ${before.kind}`);
    }
    for (const result of [before, after]) {
        if (result.samples.some((sample) => ['submit', 'completed'].some((phase) => !Number.isFinite(sample[phase]) || sample[phase] < 0))) {
            throw new Error(`Invalid timings: ${before.kind}`);
        }
    }
});
timing('builder startup', baseline.startup.samples, candidate.startup.samples);
console.log(`Startup textures (created/deleted): ${JSON.stringify(baseline.startup.textures)} -> ${JSON.stringify(candidate.startup.textures)}`);
for (const metric of ['usedSize', 'backingStorageSize']) {
    const retained = (report) => report.startup.heap.held[metric] - report.startup.heap.empty[metric];
    console.log(`64 retained builders/${metric}: ${retained(baseline)} -> ${retained(candidate)} bytes`);
}
baseline.results.forEach((before, index) => {
    const after = candidate.results[index];
    console.log(`${before.kind}: buffers=${after.buffers}, stored groups=${after.drawGroups}, actual draws=${after.calls.drawCalls}; uploads ${
        before.calls.uploads} -> ${after.calls.uploads}, bytes ${before.calls.bytes} -> ${after.calls.bytes}`);
    for (const phase of ['submit', 'completed']) {
        timing(`${before.kind}/${phase}`, before.samples.map((sample) => sample[phase]), after.samples.map((sample) => sample[phase]));
    }
});
