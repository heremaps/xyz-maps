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
const allowKeyFormatChange = args.includes('--allow-key-format-change');
const allowModelGeometrySharing = args.includes('--allow-model-geometry-sharing');
const files = args.filter((arg) => !['--allow-key-format-change', '--allow-model-geometry-sharing'].includes(arg));
if (files.length !== 2) throw new Error('Usage: node benchmarks/compare.mjs baseline.json candidate.json [--allow-key-format-change] [--allow-model-geometry-sharing]');
const [baseline, candidate] = files.map((file) => JSON.parse(readFileSync(file, 'utf8')));
if (!!baseline.profiling !== !!candidate.profiling) throw new Error('Do not compare profiled timings with normal benchmark timings');
if (!isDeepStrictEqual(baseline.backend, candidate.backend)) throw new Error('Incompatible benchmark metadata: backend');
for (const key of ['schema', 'workload', 'browser', 'platform', 'arch', 'softwareRendering', 'samples', 'warmupBatches', 'buildsPerBatch']) {
    if (baseline[key] !== candidate[key]) throw new Error(`Incompatible benchmark metadata: ${key}`);
}
if (baseline.results.length !== candidate.results.length) throw new Error('Scenario count changed');
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)];
const outputSignature = (signature) => {
    let result = signature;
    if (allowKeyFormatChange && signature?.batches) {
        result = {...result, batches: signature.batches.map((batch) => ({
            ...batch, keys: batch.keys.map(([, index]) => index)
        }))};
    }
    if (allowModelGeometrySharing) {
        const descriptors = new Map();
        const geometryNames = new Set(['a_position', 'a_normal', 'a_tangent', 'a_uv', 'a_color']);
        const attributes = (values, baseModel = false) => values?.map((attribute) => {
            if (attribute.descriptor === undefined) return attribute;
            const {descriptor, ...content} = attribute;
            if (baseModel && geometryNames.has(attribute.name) && !attribute.instanced) return content;
            if (!descriptors.has(descriptor)) descriptors.set(descriptor, descriptors.size);
            return {...content, descriptor: descriptors.get(descriptor)};
        });
        result = {...result, bytes: 0, shapes: signature.shapes.map((shape) => ({
            ...shape, attributes: attributes(shape.attributes, ['Model', 'Terrain'].includes(shape.type)),
            groups: shape.groups.map((group) => ({...group, attributes: attributes(group.attributes)}))
        }))};
    }
    return result;
};
baseline.results.forEach((before, index) => {
    const after = candidate.results[index];
    if (allowModelGeometrySharing && (after.signature.bytes > before.signature.bytes ||
        (!before.signature.shapes.some((shape) => ['Model', 'Terrain'].includes(shape.type)) &&
            before.signature.bytes !== after.signature.bytes))) {
        throw new Error(`Unexpected backing-storage change: ${before.kind}/${before.count}`);
    }
    if (!isDeepStrictEqual(before.grouping, after.grouping)) {
        throw new Error(`Grouping changed: ${before.kind}/${before.count}: ${
            JSON.stringify(before.grouping)} -> ${JSON.stringify(after.grouping)}`);
    }
    if (before.kind !== after.kind || before.count !== after.count ||
        !isDeepStrictEqual(outputSignature(before.signature), outputSignature(after.signature))) {
        throw new Error(`Workload/output changed: ${before.kind}/${before.count}`);
    }
});
if (allowKeyFormatChange) console.log('Key text comparison disabled explicitly; batch order, grouping and complete buffer output remain checked.');
if (allowModelGeometrySharing) console.log('Model/Terrain base geometry descriptor identities and nonincreasing backing bytes may change explicitly; keys, content, instance/debug sharing, grouping and render state remain checked.');
if (baseline.results[0]?.grouping) {
    console.log('Grouping | features | batches before -> after | buffers before -> after | draw groups before -> after | buffers by type | batches by type | draw groups by type | zIndex (batches/buffers/draws)');
    baseline.results.forEach((before, index) => {
        const after = candidate.results[index];
        console.log(`${before.kind} | ${before.count} | ${before.grouping.batches} -> ${after.grouping.batches} | ${
            before.grouping.buffers} -> ${after.grouping.buffers} | ${before.grouping.drawGroups} -> ${
            after.grouping.drawGroups} | ${JSON.stringify(after.grouping.buffersByType)} | ${
            JSON.stringify(after.grouping.batchesByType)} | ${JSON.stringify(after.grouping.drawGroupsByType)} | ${
            Object.entries(after.grouping.byZIndex).map(([zIndex, partition]) =>
                `${zIndex}:${partition.batches}/${partition.buffers}/${partition.drawGroups}`).join(',')}`);
    });
}
console.log('Scenario | baseline median ms | candidate median ms | delta | baseline p10..p90 | candidate p10..p90');
baseline.results.forEach((before, index) => {
    const after = candidate.results[index];
    for (const phase of ['total', 'build', 'finalize', 'release']) {
        const a = before.samples.map((sample) => sample[phase]);
        const b = after.samples.map((sample) => sample[phase]);
        const oldMedian = percentile(a, 0.5);
        const newMedian = percentile(b, 0.5);
        console.log(`${before.kind}/${before.count}/${phase} | ${oldMedian.toFixed(3)} | ${newMedian.toFixed(3)} | ${
            oldMedian ? (100 * (newMedian / oldMedian - 1)).toFixed(1) + '%' : 'below timer resolution'} | ${
            percentile(a, 0.1).toFixed(3)}..${percentile(a, 0.9).toFixed(3)} | ${
            percentile(b, 0.1).toFixed(3)}..${percentile(b, 0.9).toFixed(3)}`);
    }
});
