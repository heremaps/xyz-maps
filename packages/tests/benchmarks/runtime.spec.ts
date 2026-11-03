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
import {expect, it, vi} from 'vitest';
import {commands} from 'vitest/browser';
import {LocalProvider, ModelData, ModelStyle, CircleStyle, PolygonStyle, TileLayer} from '@here/xyz-maps-core';
import {Map as MapView} from '../../display/src/Map';
import WebglDisplay from '../../display/src/displays/webgl/Display';
import {GLRender} from '../../display/src/displays/webgl/GLRender';
import {FeatureBufferBuilder} from '../../display/src/displays/webgl/buffer/factory/FeatureBufferBuilder';
import {HeightMapTileCache} from '../../display/src/displays/webgl/HeightMapTileCache';
import {RenderTile} from '../../display/src/displays/webgl/RenderTile';
import {waitForViewportReady} from '../src/synchronization/viewport';
import {getBenchmarkBackend} from './commands';
import type {HeapUsage} from './commands';

declare const __XYZ_BENCH_WARMUP__: number;
const FRAMES_PER_BATCH = 16;

function fingerprint(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let hash = 2166136261;
    let colored = 0;
    for (let i = 0; i < pixels.length; i++) hash = Math.imul(hash ^ pixels[i], 16777619);
    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] !== pixels[0] || pixels[i + 1] !== pixels[1] || pixels[i + 2] !== pixels[2]) colored++;
    }
    return {hash: hash >>> 0, colored};
}

function uploadBytes(data: AllowSharedBufferSource | number | null, offset: number = 0, length?: number) {
    if (typeof data === 'number') return data;
    if (!data) return 0;
    const elementSize = 'BYTES_PER_ELEMENT' in data ? Number(data.BYTES_PER_ELEMENT) : 1;
    return length ? length * elementSize : data.byteLength - offset * elementSize;
}

it('measures builder startup, retained heap, and real native rendering', async () => {
    const probe = new GLRender({});
    probe.init(document.createElement('canvas'), 1, new HeightMapTileCache());
    const gpu = getBenchmarkBackend(probe.device.gl);
    const builders: FeatureBufferBuilder[] = [];
    let startup: {count: number; samples: number[]; heap: {empty: HeapUsage; held: HeapUsage; released?: HeapUsage};
        textures: {created: number; deleted: number}};
    try {
        const empty = await commands.measureBufferHeap();
        const samples: number[] = [];
        for (let i = 0; i < 64; i++) {
            const start = performance.now();
            builders.push(new FeatureBufferBuilder(probe.device, null, 1));
            samples.push(performance.now() - start);
        }
        const held = await commands.measureBufferHeap();
        const createTexture = vi.spyOn(probe.device.gl, 'createTexture');
        const deleteTexture = vi.spyOn(probe.device.gl, 'deleteTexture');
        try {
            const builder = new FeatureBufferBuilder(probe.device, null, 1);
            builder.destroy();
            startup = {count: 64, samples, heap: {empty, held}, textures: {
                created: createTexture.mock.calls.length, deleted: deleteTexture.mock.calls.length
            }};
        } finally {
            createTexture.mockRestore();
            deleteTexture.mockRestore();
        }
        builders.forEach((builder) => builder.destroy());
        builders.length = 0;
        startup.heap.released = await commands.measureBufferHeap();
    } finally {
        builders.forEach((builder) => builder.destroy());
        probe.destroy();
    }

    const results = [];
    for (const kind of ['points-reuse', 'points-create', 'polygon-outlines', 'model-shared']) {
        const container = document.createElement('div');
        container.style.cssText = 'width:256px;height:256px';
        document.body.appendChild(container);
        const provider = new LocalProvider();
        const styles: Record<string, (ModelStyle | CircleStyle | PolygonStyle)[]> = {};
        const position: number[] = [];
        const index: number[] = [];
        const geometry: ModelData['geometries'][number] = {position, index};
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const first = geometry.position.length / 3;
                position.push(x, y, 0, x + 1, y, 0, x, y + 1, 0);
                index.push(first, first + 1, first + 2);
            }
        }
        const model: ModelData = {
            geometries: [geometry],
            faces: [{geometryIndex: 0, material: 'a'}, {geometryIndex: 0, material: 'b'}],
            materials: {a: {diffuse: [1, 0, 0], illumination: 0}, b: {diffuse: [0, 1, 0], illumination: 0}}
        };
        for (let i = 0; i < (kind === 'points-create' ? 32 : kind === 'polygon-outlines' ? 8 : 1); i++) {
            styles[String(i)] = kind === 'model-shared'
                ? [{type: 'Model', zIndex: 0, model, scale: [0.5, 0.5, 0.5]}]
                : kind === 'polygon-outlines'
                    ? [{type: 'Polygon', zIndex: 0, fill: '#ff0000', stroke: `rgb(0,${30 + i * 20},255)`, strokeWidth: 1, opacity: 0.6}]
                    : [{type: 'Circle', zIndex: 0, radius: 2, fill: `rgb(255,${i * 7},0)`}];
        }
        const layer = new TileLayer({provider, style: {
            styleGroups: styles,
            assign: (feature) => String(feature.properties.variant)
        }});
        let map: MapView;
        try {
            const options = {
                center: {longitude: 0.001, latitude: 0.001}, zoomlevel: 18, devicePixelRatio: 1,
                renderOptions: {preserveDrawingBuffer: true}, layers: [layer]
            };
            map = new MapView(container, options);
            const display = map['_display'];
            if (!(display instanceof WebglDisplay)) throw new Error('Runtime benchmark requires WebGL');
            const gl = display.render.device.gl;
            if (!(gl instanceof WebGL2RenderingContext)) throw new Error('Runtime benchmark requires WebGL2');
            expect(gl.drawingBufferWidth).toBe(256);
            expect(gl.drawingBufferHeight).toBe(256);
            expect(getBenchmarkBackend(gl)).toStrictEqual(gpu);
            // Spies are confined to the untimed first upload/replay, not the timed frames.
            const bufferData = vi.spyOn(gl, 'bufferData');
            const bufferSubData = vi.spyOn(gl, 'bufferSubData');
            const drawArrays = vi.spyOn(gl, 'drawArrays');
            const drawElements = vi.spyOn(gl, 'drawElements');
            const drawArraysInstanced = vi.spyOn(gl, 'drawArraysInstanced');
            const drawElementsInstanced = vi.spyOn(gl, 'drawElementsInstanced');
            let calls;
            try {
                const columns = kind === 'model-shared' ? 8 : 32;
                const count = columns * columns;
                await waitForViewportReady(map, () => {
                    for (let i = 0; i < count; i++) {
                        const x = 8 + (i % columns) * 240 / columns;
                        const y = 8 + Math.floor(i / columns) * 240 / columns;
                        const point = map.pixelToGeo(x, y);
                        const corner = map.pixelToGeo(x + 4, y + 4);
                        layer.addFeature({
                            type: 'Feature', id: i, properties: {variant: i % Object.keys(styles).length},
                            geometry: kind === 'polygon-outlines' ? {type: 'Polygon', coordinates: [[
                                [point.longitude, point.latitude], [corner.longitude, point.latitude],
                                [corner.longitude, corner.latitude], [point.longitude, corner.latitude],
                                [point.longitude, point.latitude]
                            ]]} : {type: 'Point', coordinates: [point.longitude, point.latitude]}
                        });
                    }
                });
                gl.finish();
                const isGeometry = (target: number) => target === gl.ARRAY_BUFFER || target === gl.ELEMENT_ARRAY_BUFFER;
                const dataCalls = bufferData.mock.calls.filter((call) => isGeometry(call[0]));
                const subDataCalls = bufferSubData.mock.calls.filter((call) => isGeometry(call[0]));
                const bytes = dataCalls.reduce((n, call) => n + uploadBytes(call[1], call[3], call[4]), 0)
                    + subDataCalls.reduce((n, call) => n + uploadBytes(call[2], call[3], call[4]), 0);
                const uploads = dataCalls.length + subDataCalls.length;
                [drawArrays, drawElements, drawArraysInstanced, drawElementsInstanced].forEach((spy) => spy.mockClear());
                display['viewport']();
                gl.finish();
                calls = {uploads, bytes, drawCalls: drawArrays.mock.calls.length + drawElements.mock.calls.length
                    + drawArraysInstanced.mock.calls.length + drawElementsInstanced.mock.calls.length};
            } finally {
                [bufferData, bufferSubData, drawArrays, drawElements, drawArraysInstanced, drawElementsInstanced]
                    .forEach((spy) => spy.mockRestore());
            }
            const expected = fingerprint(gl);
            expect(expected.colored).toBeGreaterThan(0);
            expect(calls.drawCalls).toBeGreaterThan(0);
            const tiles = display['_zSortedTileBuffers'].tileBuffers.filter((tile): tile is RenderTile => tile.tiled);
            const unique = new Set(tiles.map((tile) => tile.buffer));
            const expectedBuffers = kind === 'points-create' ? 32 : kind === 'polygon-outlines' ? 16 : kind === 'model-shared' ? 2 : 1;
            const drawGroups = [...unique].reduce((n, buffer) => n + buffer.groups.length, 0);
            expect(unique.size).toBe(expectedBuffers);
            expect(drawGroups).toBe(expectedBuffers);
            expect(calls.drawCalls).toBe(kind === 'polygon-outlines' ? 25 : expectedBuffers);
            if (kind === 'model-shared') {
                for (const buffer of unique) expect(buffer.instances).toBe(64);
            }
            const samples = [];
            for (let batch = 0; batch < __XYZ_BENCH_WARMUP__ + 20; batch++) {
                gl.finish();
                const start = performance.now();
                for (let frame = 0; frame < FRAMES_PER_BATCH; frame++) display['viewport']();
                const submitted = performance.now();
                gl.finish();
                const completed = performance.now();
                if (batch >= __XYZ_BENCH_WARMUP__) {
                    samples.push({submit: (submitted - start) / FRAMES_PER_BATCH, completed: (completed - start) / FRAMES_PER_BATCH});
                }
            }
            expect(fingerprint(gl)).toStrictEqual(expected);
            results.push({kind, count: kind === 'model-shared' ? 64 : 1024,
                buffers: unique.size, drawGroups,
                calls, fingerprint: expected, samples});
        } finally {
            map?.destroy();
            provider.clear();
            container.remove();
        }
    }
    await commands.writeBufferBenchmark(JSON.stringify({
        workload: 'runtime-1', browser: navigator.userAgent, backend: gpu, width: 256, height: 256,
        samples: 20, warmupBatches: __XYZ_BENCH_WARMUP__, framesPerBatch: FRAMES_PER_BATCH, startup, results
    }));
});
