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
import {expect, it} from 'vitest';
import {commands} from 'vitest/browser';
import {LocalProvider, Tile, TileLayer, ModelData, ModelStyle, GeoJSONFeature} from '@here/xyz-maps-core';
import {Expression} from '@here/xyz-maps-common';
import {Style, StyleGroup} from '../../display/src/displays/styleTools';
import {Layer, Layers} from '../../display/src/displays/Layers';
import {FeatureBufferBuilder} from '../../display/src/displays/webgl/buffer/factory/FeatureBufferBuilder';
import type {BatchesByZIndex} from '../../display/src/displays/webgl/buffer/factory/BufferBatch';
import {FeatureBufferBuildTask} from '../../display/src/displays/webgl/buffer/factory/FeatureBufferBuildTask';
import {GeometryBuffer, ElementsDrawCmd, Uniform, DynamicUniform} from '../../display/src/displays/webgl/buffer/GeometryBuffer';
import {Attribute} from '../../display/src/displays/webgl/buffer/Attribute';
import {GLRender} from '../../display/src/displays/webgl/GLRender';
import {HeightMapTileCache} from '../../display/src/displays/webgl/HeightMapTileCache';
import {CollisionHandler} from '../../display/src/displays/webgl/CollisionHandler';
import {Texture} from '../../display/src/displays/webgl/Texture';
import {STYLE_MATRICES, FixtureStyle, StyleMatrixScenario, getStyleMatrix, isStyleMatrixScenario} from './styleMatrices';
import {getBenchmarkBackend} from './commands';
import type {ProfileMetrics, ProfileResult} from './commands';

type Scenario = StyleMatrixScenario | 'points' | 'point-batches' | 'style-batches' | 'circle-color-batches' | 'circle-width-batches' | 'circle-style-matrix' | 'rectangles' | 'lines' | 'dashed-lines'
    | 'dynamic-lines' | 'lines-3d' | 'polygons' | 'polygon-outlines' | 'extrudes' | 'text' | 'icons'
    | 'boxes' | 'spheres' | 'vertical-lines' | 'heatmap' | 'model' | 'model-modes' | 'clipped-models'
    | 'terrain' | 'mesh-terrain' | 'mixed';
const LEGACY_SCENARIOS: Scenario[] = [
    'points', 'point-batches', 'style-batches', 'circle-color-batches', 'circle-width-batches', 'circle-style-matrix', 'rectangles', 'lines', 'dashed-lines', 'dynamic-lines',
    'lines-3d', 'polygons', 'polygon-outlines', 'extrudes', 'text', 'icons', 'boxes', 'spheres',
    'vertical-lines', 'heatmap', 'model', 'model-modes', 'clipped-models', 'terrain', 'mesh-terrain', 'mixed'
];
const SCENARIOS: Scenario[] = [...LEGACY_SCENARIOS, ...Object.keys(STYLE_MATRICES).filter(isStyleMatrixScenario)];
const MIXED: Scenario[] = ['points', 'lines', 'polygons', 'rectangles', 'boxes', 'text', 'icons', 'heatmap', 'model'];
const CIRCLE_VARIANTS: Partial<FixtureStyle>[] = [
    {},
    {radius: 3}, {radius: 5},
    {fill: '#00ff00'}, {fill: '#0000ff'},
    {stroke: '#00ff00'}, {stroke: '#ff0000'},
    {strokeWidth: 2}, {strokeWidth: 3},
    {opacity: 0.3}, {opacity: 0.6},
    {offsetX: 2}, {offsetX: '2m'},
    {offsetY: 2}, {offsetY: ['literal', '2m']},
    {offsetZ: 2}, {offsetZ: '2m'},
    {alignment: 'viewport'}, {alignment: undefined},
    {pointerEvents: false}, {pointerEvents: true},
    {altitude: false}, {altitude: 'terrain'},
    {depthTest: false}, {depthTest: true},
    {scaleByAltitude: true}, {scaleByAltitude: false},
    {zLayer: 1}, {zLayer: 2},
    {rotation: 30}
];
declare const __XYZ_BENCH_SCENARIO__: Scenario | 'all' | 'legacy' | 'matrices';
declare const __XYZ_BENCH_WARMUP__: number;
declare const __XYZ_BENCH_PROFILE__: boolean;

function fixture(kind: Scenario, count: number) {
    const matrix = getStyleMatrix(kind);
    const tile = new Tile('12222222222222', 'vector', true);
    const [west, south, east, north] = tile.bounds;
    const dx = (east - west) / 100;
    const dy = (north - south) / 100;
    const provider = new LocalProvider();
    tile.provider = provider;
    const layer = new TileLayer({provider});
    const model: ModelData & {id: string} = {
        id: `benchmark-${kind}-${count}`,
        geometries: [{
            position: [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0,
                0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
            index: [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1,
                3, 2, 6, 3, 6, 7, 0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2]
        }],
        materials: {a: {diffuse: [1, 0, 0]}, b: {diffuse: [0, 1, 0]}},
        faces: [{geometryIndex: 0, material: 'a'}, {geometryIndex: 0, material: 'b'}]
    };
    const heightMap = Float32Array.from({length: 33 * 33}, (_, i) => i % 33);
    if (kind === 'terrain' || kind === 'mesh-terrain' || matrix?.family === 'terrain') {
        const position = [];
        const index = [];
        for (let y = 0; y < 33; y++) {
            for (let x = 0; x < 33; x++) {
                position.push(x * 8, 0, y * 8);
                if (x < 32 && y < 32) {
                    const v = y * 33 + x;
                    index.push(v, v + 1, v + 33, v + 1, v + 34, v + 33);
                }
            }
        }
        model.geometries[0] = {position, index};
    }
    if (kind === 'model-modes') {
        model.materials.a.mode = 'Points';
        model.materials.a.pointSize = 3;
    }
    const image = document.createElement('canvas');
    image.width = image.height = 2;
    const context = image.getContext('2d');
    if (!context) throw new Error('Benchmark image canvas is unavailable');
    context.fillStyle = kind === 'dashed-lines' ? '#0000ff' : '#ff0000';
    context.fillRect(0, 0, 2, 2);
    const src = image.toDataURL();
    const gradient = {type: 'LinearGradient' as const, stops: {0: '#000000', 0.5: '#00ff00', 1: '#ff0000'}};
    const features = [];
    const styles = new Map<string, StyleGroup>();
    for (let i = 0; i < count; i++) {
        const family = kind === 'mixed' ? MIXED[i % MIXED.length] : matrix?.family || kind;
        const variant = matrix ? i % (matrix.variants.length * 2) : kind === 'circle-color-batches' || kind === 'circle-width-batches' || kind === 'circle-style-matrix' ? i % 60
            : kind === 'style-batches' ? i % 32 : kind === 'model-modes' ? i % 8 : 0;
        const x = west + (2 + i % 80) * dx;
        const y = south + (2 + Math.floor(i / 80) % 80) * dy;
        const isLine = ['lines', 'dashed-lines', 'dynamic-lines', 'lines-3d'].includes(family);
        const isPolygon = ['polygons', 'polygon-outlines', 'extrudes'].includes(family);
        const geometry: GeoJSONFeature['geometry'] = isLine ? {
            type: 'LineString',
            coordinates: Array.from({length: 24}, (_, p) => family === 'lines-3d'
                ? [x + p * dx / 4, y + p % 2 * dy, 10 + p]
                : [x + p * dx / 4, y + p % 2 * dy])
        } : isPolygon ? {
            type: 'Polygon',
            coordinates: [
                [[x, y], [x + dx, y], [x + dx, y + dy], [x, y + dy], [x, y]],
                [[x + dx / 4, y + dy / 4], [x + dx / 4, y + dy / 2],
                    [x + dx / 2, y + dy / 2], [x + dx / 2, y + dy / 4], [x + dx / 4, y + dy / 4]]
            ]
        } : {type: 'Point', coordinates: [x, y, 20]};
        const feature = layer.addFeature({
            type: 'Feature', id: i, geometry,
            properties: {useHeightMap: family !== 'mesh-terrain', heightMap, minHeight: 0, maxHeight: 32,
                minAltitude: 0, maxAltitude: 32, label: `AB${i % 10}`, weight: 1 + i % 4}
        });
        if (family === 'clipped-models') feature.bbox = [x - dx, y - dy, x + dx, y + dy];
        const zIndex = family === 'point-batches' ? i % 32 : 0;
        const key = `${family}:${variant}:${zIndex}`;
        if (!styles.has(key)) {
            const common = {zIndex, collide: true};
            let style: FixtureStyle;
            if (isLine) {
                style = {type: 'Line', ...common, stroke: '#ff0000', strokeWidth: 3};
                if (family === 'dashed-lines') {
                    style = {...style, strokeWidth: '2m', strokeDasharray: ['4m', '2px'],
                        strokeDashimage: src, offset: '-1m', strokeLinecap: 'square', strokeLinejoin: 'bevel', opacity: 0.6};
                } else if (family === 'dynamic-lines') {
                    style = {...style, strokeWidth: ['+', 2, ['zoom']],
                        strokeDasharray: ['step', ['zoom'], ['literal', [4, 2]], 16, ['literal', [8, 4]]]};
                } else if (family === 'lines-3d') {
                    style = {...style, altitude: true, depthTest: true, strokeWidth: '2m', offset: '1m'};
                }
            } else if (isPolygon) {
                style = {type: 'Polygon', ...common, fill: '#ff0000'};
                if (family === 'polygon-outlines') {
                    style = {...style, opacity: 0.5, stroke: '#0000ff', strokeWidth: 2, fillIntensity: 0.8,
                        specular: '#cccccc', shininess: 8, emissive: '#112233'};
                } else if (family === 'extrudes') {
                    style = {...style, extrude: 20, extrudeBase: 5, stroke: '#0000ff', strokeWidth: 1,
                        opacity: 0.6, fillIntensity: 0.8, specular: '#cccccc', shininess: 8, emissive: '#112233'};
                }
            } else if (family === 'model' || family === 'model-modes' || family === 'clipped-models') {
                const modelStyle: ModelStyle = {type: 'Model', ...common, model, modelId: variant + 1};
                if (family === 'model-modes') {
                    Object.assign(modelStyle, {
                        alphaMode: ['opaque', 'mask', 'blend', 'auto'][variant % 4], alphaCutoff: 0.35,
                        materialOverrides: variant === 3 ? {b: {alphaMode: 'mask', alphaCutoff: 0.2}} : undefined,
                        showWireframe: !!(variant & 1), showBBox: !!(variant & 2),
                        cullFace: variant % 3 === 0 ? false : variant % 3 === 1 ? 'Front' : 'Back',
                        scale: [1 + variant / 10, 1, 1.5], rotate: [0.1, 0.2, 0.3], translate: [1, 2, 3],
                        altitude: variant === 6 ? 'terrain' : true, depthTest: !(variant & 1),
                        specular: '#303030', shininess: 16, emissive: '#010203'
                    });
                }
                style = modelStyle;
            } else if (family === 'terrain' || family === 'mesh-terrain') {
                style = {type: 'Terrain', ...common, model, modelId: 1, specular: '#303030', shininess: 16, emissive: '#010203'};
            } else if (family === 'rectangles') {
                style = {type: 'Rect', ...common, width: ['literal', '4m'], height: ['literal', '2m'], fill: '#ff0000', opacity: 0.6,
                    rotation: 35, altitude: true, depthTest: true, alignment: 'map',
                    offsetX: '2px', offsetY: ['literal', '-1m'], offsetZ: '3px'};
            } else if (family === 'boxes') {
                style = {type: 'Box', ...common, width: 8, height: 6, depth: 4, fill: '#ff0000',
                    opacity: 0.6, altitude: true, depthTest: true, rotation: 20,
                    specular: '#cccccc', shininess: 8, emissive: '#112233'};
            } else if (family === 'spheres') {
                style = {type: 'Sphere', ...common, radius: '5m', fill: '#ff0000', altitude: true,
                    depthTest: true, specular: '#cccccc', shininess: 8, emissive: '#112233'};
            } else if (family === 'vertical-lines') {
                style = {type: 'VerticalLine', ...common, stroke: '#ff0000', strokeWidth: 2, offsetZ: '2m', altitude: true};
            } else if (family === 'text') {
                style = {type: 'Text', ...common, textRef: 'properties.label', font: '12px monospace',
                    fill: '#ff0000', stroke: '#000000', strokeWidth: 1, altitude: true, depthTest: true,
                    alignment: 'map', offsetX: '2m', offsetY: 3, offsetZ: '1m'};
            } else if (family === 'icons') {
                style = {type: 'Image', ...common, src, width: 8, height: 6, opacity: 0.6,
                    altitude: true, depthTest: true, alignment: 'viewport', rotation: 15, offsetX: 2};
            } else if (family === 'heatmap') {
                style = {type: 'Heatmap', ...common, radius: 16, fill: gradient,
                    weight: (feature) => feature.properties.weight, intensity: 0.8, opacity: 0.6};
            } else if (family === 'circle-style-matrix') {
                style = {type: 'Circle', ...common, radius: 4, fill: '#ff0000', stroke: '#0000ff',
                    strokeWidth: 1, opacity: 1, altitude: true, depthTest: true, alignment: 'map',
                    pointerEvents: true, scaleByAltitude: false, zLayer: 0, ...CIRCLE_VARIANTS[variant % 30]};
            } else if (family === 'circle-color-batches') {
                style = {type: 'Circle', ...common, radius: 4,
                    fill: `#${(0x100000 + (variant % 30) * 0x050101).toString(16).padStart(6, '0')}`};
            } else if (family === 'circle-width-batches') {
                style = {type: 'Circle', ...common, radius: 4, fill: '#ff0000',
                    stroke: '#0000ff', strokeWidth: 1 + variant % 30};
            } else if (family === 'style-batches') {
                const shape = variant & 1
                    ? {type: 'Rect' as const, width: 5 + variant, height: 8 + variant, rotation: variant}
                    : {type: 'Circle' as const, radius: 4 + variant};
                style = {...shape, ...common, fill: '#ff0000', stroke: '#0000ff', strokeWidth: 1,
                    opacity: variant & 2 ? 0.6 : 1, altitude: !!(variant & 4), depthTest: !!(variant & 8),
                    alignment: variant & 16 ? 'map' : 'viewport', pointerEvents: !(variant & 2),
                    offsetX: variant, offsetY: ['literal', '1m'], offsetZ: 2, scaleByAltitude: !!(variant & 16)};
            } else {
                style = {type: 'Circle', ...common, radius: 4, fill: '#ff0000'};
            }
            if (matrix) style = {...style, ...matrix.base, ...matrix.variants[variant % matrix.variants.length]};
            styles.set(key, [style]);
        }
        layer.setStyleGroup(feature, styles.get(key));
        features.push(feature);
    }
    if (kind === 'circle-color-batches' || kind === 'circle-width-batches' || kind === 'circle-style-matrix') {
        expect(styles.size).toBe(60);
    }
    if (matrix) expect(styles.size).toBe(matrix.variants.length * 2);
    tile.data = features;
    return {tile, layer, provider};
}

function grouping(buffers: GeometryBuffer[], groups: BatchesByZIndex) {
    const batchesByType: Record<string, number> = {};
    const buffersByType: Record<string, number> = {};
    const drawGroupsByType: Record<string, number> = {};
    const byZIndex: Record<string, {batches: number; buffers: number; drawGroups: number}> = {};
    for (const [zIndex, group] of Object.entries(groups)) {
        byZIndex[zIndex] = {batches: group.batches.length, buffers: 0, drawGroups: 0};
        for (const batch of group.batches) batchesByType[batch.type] = (batchesByType[batch.type] || 0) + 1;
    }
    for (const buffer of buffers) {
        buffersByType[buffer.type] = (buffersByType[buffer.type] || 0) + 1;
        drawGroupsByType[buffer.type] = (drawGroupsByType[buffer.type] || 0) + buffer.groups.length;
        const partition = byZIndex[buffer.zIndex] ||= {batches: 0, buffers: 0, drawGroups: 0};
        partition.buffers++;
        partition.drawGroups += buffer.groups.length;
    }
    return {
        zGroups: Object.keys(byZIndex).length,
        batches: Object.values(byZIndex).reduce((sum, partition) => sum + partition.batches, 0),
        buffers: buffers.length,
        drawGroups: buffers.reduce((sum, buffer) => sum + buffer.groups.length, 0),
        batchesByType, buffersByType, drawGroupsByType, byZIndex
    };
}

function signature(buffers: GeometryBuffer[], groups: BatchesByZIndex) {
    const stores = new Set<ArrayBufferLike>();
    const descriptors = new Map<Attribute, number>();
    const textures = new Map<Texture, number>();
    let bytes = 0;
    const uniform = (value: Uniform | DynamicUniform | undefined): unknown => {
        if (value instanceof Expression) return {expression: value.toJSON()};
        if (value instanceof Texture) {
            if (!textures.has(value)) textures.set(value, textures.size);
            return {texture: textures.get(value), width: value.width, height: value.height, format: value.format,
                type: value['type'], internalFormat: value['internalFormat'], mipMaps: value['mipMaps'],
                wrapS: value['wrapS'], wrapT: value['wrapT'], flipY: value['flipY'],
                premultiplyAlpha: value['premultiplyAlpha'], minFilter: value['minFilter'], magFilter: value['magFilter']};
        }
        if (Array.isArray(value)) return value.map(uniform);
        if (ArrayBuffer.isView(value)) return {array: value.constructor.name, values: Array.from(value)};
        if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
        return value ?? null;
    };
    const uniforms = (values: GeometryBuffer['uniforms']) => Object.keys(values).sort().map((name) => ({
        name, value: uniform(values[name])
    }));
    const attributes = (values: GeometryBuffer['attributes']) => Object.keys(values).sort().map((name) => {
        const attr = values[name];
        if ('value' in attr) return {name, value: uniform(attr.value)};
        if (!descriptors.has(attr)) descriptors.set(attr, descriptors.size);
        if (!stores.has(attr.data.buffer)) {
            stores.add(attr.data.buffer);
            bytes += attr.data.buffer.byteLength;
        }
        let checksum = 0;
        for (let i = 0; i < attr.data.length; i++) checksum += attr.data[i] * (i % 31 + 1);
        expect(Number.isFinite(checksum)).toBe(true);
        return {name, descriptor: descriptors.get(attr), size: attr.size, length: attr.data.length, checksum,
            array: attr.data.constructor.name, type: attr.type, normalized: !!attr.normalized,
            instanced: !!attr.instanced, stride: attr.stride ?? 0, offset: attr.offset ?? 0, dynamic: !!attr.dynamic};
    });
    const shapes = buffers.map((buffer) => ({
        type: buffer.type,
        instances: buffer.instances,
        id: buffer.id ?? null, light: buffer.light ?? null,
        flat: buffer.flat, pointGeometry: buffer.isPointGeometry, anchoredPixelSize: buffer.anchoredPixelSize,
        pass: buffer.pass, depth: buffer.depth ?? null, blend: buffer.blend ?? null, clip: buffer.clip ?? null,
        pointerEvents: buffer.pointerEvents ?? null, cullFace: buffer.cullFace(), mode: buffer.mode ?? null,
        zIndex: buffer.zIndex, zLayer: buffer.zLayer ?? null, renderUsage: buffer.renderUsage,
        terrainOcclusion: buffer.terrainOcclusion, fragmentTileClip: buffer.fragmentTileClip ?? null,
        requiresHeightMap: buffer.requiresHeightMap(), zRange: buffer.zRange ?? null, bbox: buffer.bbox ?? null,
        idOffsets: buffer.idOffsets, attributes: attributes(buffer.attributes), uniforms: uniforms(buffer.uniforms),
        groups: buffer.groups.map((group) => {
            const index = (group as ElementsDrawCmd).index;
            if (index && !stores.has(index.data.buffer)) {
                stores.add(index.data.buffer);
                bytes += index.data.buffer.byteLength;
            }
            let checksum = 0;
            if (index) {
                for (let i = 0; i < index.data.length; i++) checksum += index.data[i] * (i % 31 + 1);
            }
            return {mode: group.mode ?? null,
                attributes: group.attributes ? attributes(group.attributes) : null,
                uniforms: group.uniforms ? uniforms(group.uniforms) : null,
                ...(index ? {length: index.length, type: index.type, checksum}
                    : {arrays: 'arrays' in group ? group.arrays : null})};
        })
    }));
    const batches = Object.entries(groups).map(([zIndex, group]) => ({zIndex, keys: Object.entries(group.index)}));
    return {bytes, shapes, batches};
}

it('measures complete buffer construction with deterministic output and regular release', async () => {
    const renderer = new GLRender({});
    const canvas = document.createElement('canvas');
    renderer.init(canvas, 1, new HeightMapTileCache());
    const factory = new FeatureBufferBuilder(renderer.device, new CollisionHandler(null), 1);
    const results = [];
    try {
        await document.fonts.load('12px monospace');
        const scenarios: Scenario[] = __XYZ_BENCH_SCENARIO__ === 'all'
            ? SCENARIOS : __XYZ_BENCH_SCENARIO__ === 'legacy' ? LEGACY_SCENARIOS
                : __XYZ_BENCH_SCENARIO__ === 'matrices' ? SCENARIOS.filter(isStyleMatrixScenario)
                    : [__XYZ_BENCH_SCENARIO__];
        for (const kind of scenarios) {
            const matrix = getStyleMatrix(kind);
            const counts = kind === 'polygons' ? [128, 1024, 16384] : kind === 'extrudes' ? [128, 1024, 2048]
                : kind === 'spheres' ? [16, 128] : kind === 'sphere-style-matrix' ? [64, 128] : [128, 1024];
            for (const count of counts) {
                const {tile, layer, provider} = fixture(kind, count);
                const displayLayer = new Layer(layer, new Layers());
                const prepare = () => {
                    const task = new FeatureBufferBuildTask({builder: factory});
                    const data = task.init({tile, displayLayer});
                    while (task.exec(data)) {/* Warm real asset/caching paths outside timing. */}
                    return task.onDone(data);
                };
                const release = (buffers: GeometryBuffer[]) => {
                    for (const buffer of buffers) renderer.releaseGeometryBuffer(buffer, tile.quadkey);
                };
                let prepared = prepare();
                while (prepared.pendingResources.length) {
                    release(prepared.buffers);
                    await Promise.all(prepared.pendingResources);
                    prepared = prepare();
                }
                release(prepared.buffers);
                const build = () => {
                    const start = performance.now();
                    const task = new FeatureBufferBuildTask({builder: factory});
                    const data = task.init({tile, displayLayer});
                    while (task.exec(data)) {/* Drain the actual feature chunks without scheduler waits. */}
                    const built = performance.now();
                    const result = task.onDone(data);
                    const finished = performance.now();
                    expect(result.pendingResources).toHaveLength(0);
                    return {buffers: result.buffers, groups: data.batchesByZIndex, build: built - start, finalize: finished - built};
                };
                const first = build();
                expect(first.buffers.length).toBeGreaterThan(0);
                const expected = signature(first.buffers, first.groups);
                const partition = grouping(first.buffers, first.groups);
                const batchCount = matrix?.batches ?? (kind === 'circle-style-matrix' ? 26
                    : kind === 'circle-color-batches' || kind === 'circle-width-batches' ? 30
                        : kind === 'point-batches' || kind === 'style-batches' ? 32
                            : kind === 'polygon-outlines' ? 2 : kind === 'model-modes' ? 8 : kind === 'mixed' ? 9 : 1);
                const bufferCount = kind === 'model-modes' ? 16 : kind === 'mixed' ? 10
                    : ['model', 'clipped-models', 'terrain', 'mesh-terrain'].includes(matrix?.family || kind) ? batchCount * 2 : batchCount;
                expect(partition.batches, `${kind}/${count}`).toBe(batchCount);
                expect(partition.buffers).toBe(bufferCount);
                expect(partition.drawGroups).toBe((matrix?.family === 'extrudes' ? batchCount * 2
                    : kind === 'extrudes' ? 2 : kind === 'model-modes' ? 28 : bufferCount) + (matrix?.extraDrawGroups || 0));
                expect(partition.zGroups).toBe(kind === 'point-batches' ? 32 : 1);
                if (kind === 'circle-color-batches' || kind === 'circle-width-batches') {
                    expect(partition.batchesByType).toStrictEqual({Circle: 30});
                    expect(partition.buffersByType).toStrictEqual({Circle: 30});
                    expect(partition.drawGroupsByType).toStrictEqual({Circle: 30});
                    expect(partition.byZIndex).toStrictEqual({0: {batches: 30, buffers: 30, drawGroups: 30}});
                }
                for (const entry of Object.values(partition.byZIndex)) {
                    expect(entry).toStrictEqual(kind === 'point-batches'
                        ? {batches: 1, buffers: 1, drawGroups: 1}
                        : {batches: batchCount, buffers: bufferCount, drawGroups: partition.drawGroups});
                }
                if (kind === 'polygons') {
                    expect((first.buffers[0].groups[0] as ElementsDrawCmd).index.type).toBe(count === 16384 ? 5125 : 5123);
                }
                if (['model', 'clipped-models', 'terrain', 'mesh-terrain'].includes(kind)) {
                    expect(first.buffers).toHaveLength(2);
                    expect(first.buffers[0].attributes.a_modelMatrix).toBe(first.buffers[1].attributes.a_modelMatrix);
                    expect(first.buffers[0].instances).toBe(count);
                    expect((first.buffers[0].attributes.a_modelMatrix as Attribute).data).toHaveLength(count * 16);
                    expect((first.buffers[0].attributes.a_offset as Attribute).data).toHaveLength(count * 3);
                }
                if (kind === 'clipped-models') expect(first.buffers[0].fragmentTileClip).toBe(true);
                const samples = [];
                let beforeProfile: ProfileMetrics;
                for (let batch = 0; batch < __XYZ_BENCH_WARMUP__ + 20; batch++) {
                    if (__XYZ_BENCH_PROFILE__ && batch === __XYZ_BENCH_WARMUP__) {
                        beforeProfile = await commands.startBufferProfile();
                        performance.mark('buffer-measure-start');
                    }
                    let buildMs = 0;
                    let finalizeMs = 0;
                    let releaseMs = 0;
                    for (let repeat = 0; repeat < 8; repeat++) {
                        const result = build();
                        buildMs += result.build;
                        finalizeMs += result.finalize;
                        if (repeat === 0) {
                            expect(signature(result.buffers, result.groups)).toStrictEqual(expected);
                            expect(grouping(result.buffers, result.groups)).toStrictEqual(partition);
                        }
                        const beforeRelease = performance.now();
                        release(result.buffers);
                        releaseMs += performance.now() - beforeRelease;
                    }
                    if (batch >= __XYZ_BENCH_WARMUP__) {
                        samples.push({
                            build: buildMs / 8, finalize: finalizeMs / 8,
                            total: (buildMs + finalizeMs) / 8, release: releaseMs / 8
                        });
                    }
                }
                let profile: ProfileResult;
                if (__XYZ_BENCH_PROFILE__) {
                    performance.mark('buffer-measure-end');
                    const after = await commands.stopBufferProfile(`${kind}-${count}`);
                    const empty = await commands.measureBufferHeap();
                    const live = Array.from({length: 64}, () => build().buffers);
                    const held = await commands.measureBufferHeap();
                    live.forEach(release);
                    live.length = 0;
                    const released = await commands.measureBufferHeap();
                    profile = {before: beforeProfile, after, liveHeap: {tiles: 64, empty, held, released}};
                }
                results.push({kind, count, grouping: partition, signature: expected, samples, ...(profile ? {profile} : {})});
                release(first.buffers);
                provider.clear();
            }
        }
        await commands.writeBufferBenchmark(JSON.stringify({
            workload: __XYZ_BENCH_SCENARIO__ === 'legacy' ? 3 : 4, browser: navigator.userAgent,
            backend: getBenchmarkBackend(renderer.device.gl), samples: 20,
            warmupBatches: __XYZ_BENCH_WARMUP__, buildsPerBatch: 8, results
        }));
    } finally {
        factory.destroy();
        renderer.destroy();
    }
});
