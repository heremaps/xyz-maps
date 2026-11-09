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
import {describe, expect, expectTypeOf, it, vi} from 'vitest';
import {Attribute} from '../../../display/src/displays/webgl/buffer/Attribute';
import {GeometryBuffer, ElementsDrawCmd} from '../../../display/src/displays/webgl/buffer/GeometryBuffer';
import {PointBuffer} from '../../../display/src/displays/webgl/buffer/types/PointBuffer';
import {PolygonBuffer} from '../../../display/src/displays/webgl/buffer/types/PolygonBuffer';
import {ModelBuffer} from '../../../display/src/displays/webgl/buffer/types/ModelBuffer';
import {TerrainModelBuffer} from '../../../display/src/displays/webgl/buffer/types/TerrainModelBuffer';
import {TerrainFBOPlanner} from '../../../display/src/displays/webgl/TerrainFBOPlanner';
import {TextBuffer, TextBufferStyle} from '../../../display/src/displays/webgl/buffer/types/TextBuffer';
import {SymbolBuffer} from '../../../display/src/displays/webgl/buffer/types/SymbolBuffer';
import {LineBuffer} from '../../../display/src/displays/webgl/buffer/types/LineBuffer';
import {HeatmapBuffer} from '../../../display/src/displays/webgl/buffer/types/HeatmapBuffer';
import {GeometryBufferBucket} from '../../../display/src/displays/webgl/buffer/GeometryBufferBucket';
import {ModelBufferFactory} from '../../../display/src/displays/webgl/buffer/factory/ModelBufferFactory';
import {ModelResourceCache} from '../../../display/src/displays/webgl/buffer/factory/ModelResourceCache';
import {GLRender} from '../../../display/src/displays/webgl/GLRender';
import {HeightMapTileCache} from '../../../display/src/displays/webgl/HeightMapTileCache';
import {Texture} from '../../../display/src/displays/webgl/Texture';
import {FeatureBufferBuilder} from '../../../display/src/displays/webgl/buffer/factory/FeatureBufferBuilder';
import {FeatureBufferBuildTask} from '../../../display/src/displays/webgl/buffer/factory/FeatureBufferBuildTask';
import type {BufferBatch} from '../../../display/src/displays/webgl/buffer/factory/BufferBatch';
import {Layer, Layers} from '../../../display/src/displays/Layers';
import {LocalProvider, Tile, TileLayer} from '@here/xyz-maps-core';
import {Expression} from '@here/xyz-maps-common';
import WebGlDisplay from '../../../display/src/displays/webgl/Display';

describe('Lazy uniform compilation', () => {
    const expression = (resolve: () => number) => Object.assign(Object.create(Expression.prototype), {
        resolve: vi.fn(resolve)
    });

    it('initializes constants once and refreshes only scalar and unit-pair expressions on zoom', () => {
        const buffer = new GeometryBuffer(false);
        let zoom = 4;
        const scalar = expression(() => zoom);
        const pair = expression(() => zoom * 2);
        const constant = vi.fn(() => [1, 2]);
        Object.defineProperty(buffer.uniforms, 'constant', {enumerable: true, get: constant});
        buffer.addUniform('scalar', scalar);
        buffer.addUniform('pair', [pair, 1]);
        const firstBucket = 0;
        const initial = buffer.compileUniforms(firstBucket);
        const initialPair = initial.uniforms.pair;
        expect(initial.fromCache).toBe(false);
        expect(initial.uniforms).toMatchObject({constant: [1, 2], scalar: 4, pair: [8, 0]});
        expect(buffer.compileUniforms(firstBucket).fromCache).toBe(true);
        expect(scalar.resolve).toHaveBeenCalledTimes(1);
        zoom = 5;
        expect(buffer.compileUniforms(1).uniforms).toMatchObject({scalar: 5, pair: [10, 0]});
        expect(buffer.getUniformData().pair).toBe(initialPair);
        expect(constant).toHaveBeenCalledTimes(1);
        expect(scalar.resolve).toHaveBeenCalledTimes(2);
        expect(pair.resolve).toHaveBeenCalledTimes(2);
    });

    it('retains cached constants on zoom but fully refreshes explicit invalidations', () => {
        const buffer = new GeometryBuffer(false);
        buffer.addUniform('value', 1);
        buffer.compileUniforms(0);
        buffer.uniforms.value = 2;
        expect(buffer.compileUniforms(1).uniforms.value).toBe(1);
        buffer.clearUniformCache();
        expect(buffer.compileUniforms(1).uniforms.value).toBe(2);
        expect(buffer.compileUniforms(1).fromCache).toBe(true);
    });

    it('invalidates added and replaced uniforms and rebuilds dynamic membership', () => {
        const buffer = new GeometryBuffer(false);
        const zoomBucket = 0;
        const constant = [1, 2];
        buffer.addUniform('value', constant);
        buffer.compileUniforms(zoomBucket);
        const dynamic = expression(() => 3);
        buffer.addUniform('value', [dynamic, 1]);
        expect(buffer.compileUniforms(zoomBucket).uniforms.value).toEqual([3, 0]);
        expect(constant).toEqual([1, 2]);
        buffer.addUniform('value', 7);
        buffer.addUniform('added', dynamic);
        expect(buffer.compileUniforms(zoomBucket).uniforms).toMatchObject({value: 7, added: 3});
        buffer.compileUniforms(1);
        expect(dynamic.resolve).toHaveBeenCalledTimes(3);
        buffer.addUniform('added', 8);
        buffer.compileUniforms(zoomBucket);
        buffer.compileUniforms(1);
        expect(dynamic.resolve).toHaveBeenCalledTimes(3);
    });

    it('refreshes for each changed zoom bucket', () => {
        const buffer = new GeometryBuffer(false);
        const dynamic = expression(() => 3);
        buffer.addUniform('value', dynamic);
        buffer.compileUniforms(0);
        buffer.compileUniforms(1);
        buffer.compileUniforms(2);
        expect(dynamic.resolve).toHaveBeenCalledTimes(3);
    });

    it('quantizes zoom into buckets without visiting cached tiles', () => {
        const display = Object.create(WebGlDisplay.prototype);
        const readBuckets = vi.fn(() => {
            throw new Error('Zoom must not visit cached tiles');
        });
        Object.defineProperty(display, 'buckets', {get: readBuckets});
        display.zoom = 4;
        display.render = {uniformZoomBucket: 160};
        display.setZoom(4);
        expect(display.render.uniformZoomBucket).toBe(160);
        expect(display.setZoom(4.024)).toBe(true);
        expect(display.render.uniformZoomBucket).toBe(160);
        expect(display.setZoom(4.025)).toBe(true);
        expect(display.render.uniformZoomBucket).toBe(161);
        display.setZoom(4.025);
        expect(display.render.uniformZoomBucket).toBe(161);
        display.setZoom(4.024);
        expect(display.render.uniformZoomBucket).toBe(160);
        expect(readBuckets).not.toHaveBeenCalled();
    });

    it('refreshes uniforms after explicit invalidation within the same zoom bucket', () => {
        const buffer = new GeometryBuffer(false);
        const dynamic = expression(() => 3);
        buffer.addUniform('value', dynamic);
        const zoomBucket = 1;
        buffer.compileUniforms(zoomBucket);
        expect(buffer.compileUniforms(zoomBucket).fromCache).toBe(true);
        expect(dynamic.resolve).toHaveBeenCalledTimes(1);
        buffer.addUniform('constant', 5);
        expect(buffer.compileUniforms(zoomBucket).uniforms.constant).toBe(5);
        expect(dynamic.resolve).toHaveBeenCalledTimes(2);
        buffer.clearUniformCache();
        expect(buffer.compileUniforms(zoomBucket).fromCache).toBe(false);
        expect(dynamic.resolve).toHaveBeenCalledTimes(3);
    });
});

const geometry = () => ({
    position: [0, 0, 0, 2, 0, 0, 0, 3, 4], normal: [0, 1, 0, 0, 1, 0, 0, 1, 0],
    bbox: [0, 0, 0, 2, 3, 4]
});

describe('Render-only handoff', () => {
    it('requires finalization before transferring builder ownership', () => {
        expect(() => new PointBuffer().toRenderBuffer()).toThrow('Finalize');
    });

    it.each(['Line', 'Polygon', 'Circle'])('preserves %s geometry, render state and picking without builder fields', (type) => {
        const source = type === 'Line' ? new LineBuffer() :
            type === 'Polygon' ? new PolygonBuffer() : new PointBuffer(true, 256);
        source.getPositionAttribute().data.push(0, 0, 1, 0, 0, 1);
        if (type === 'Polygon') source.setIndex(new Uint32Array([0, 1, 2]));
        source.setIdOffset('feature');
        source.setRequiresHeightMap(true);
        source.addUniform('u_opacity', 0.5);
        source.finalize(type);
        source.pass = 3;
        source.depth = source.blend = true;
        source.renderUsage = 1;
        source.terrainOcclusion = 1;
        source.zRange = [2, 10];
        source.pixelPerfect = true;
        source.mode = GeometryBuffer.MODE_GL_LINES;
        source.pointerEvents = false;
        const attribute = source.attributes.a_position as Attribute;
        const ref = attribute.ref;
        const compiledUniforms = source.getUniformData();
        const rendered = source.toRenderBuffer();
        expect(Object.getPrototypeOf(rendered)).toBe(GeometryBuffer.prototype);
        expect(rendered.uid).not.toBe(source.uid);
        for (const field of ['flexAttributes', 'first', 'i32', 'isPointGeometry', 'finalized', '_index', 'arrayCount']) {
            expect(Object.prototype.hasOwnProperty.call(rendered, field), field).toBe(false);
        }
        expect(rendered.attributes.a_position).toBe(attribute);
        expect(attribute.ref).toBe(ref);
        expect(rendered.groups).toBe(source.groups);
        expect(rendered.uniforms).not.toBe(source.uniforms);
        expect(rendered.getUniformData()).not.toBe(compiledUniforms);
        expect(rendered.compileUniforms(0).uniforms.u_opacity).toBe(0.5);
        expect(rendered.compileUniforms(0).fromCache).toBe(true);
        expect(rendered.idOffsets).toBe(source.idOffsets);
        expect(rendered.rayIntersects).toBe(source.rayIntersects);
        for (const field of ['pass', 'depth', 'blend', 'renderUsage', 'terrainOcclusion', 'zRange',
            'pixelPerfect', 'mode', 'pointerEvents', 'flat', 'anchoredPixelSize'] as const) {
            expect(rendered[field], field).toBe(source[field]);
        }
        expect(rendered.cullFace()).toBe(source.cullFace());
        expect(rendered.getHeightBounds(2)).toEqual([4, 20]);
        expect(rendered.requiresHeightMap()).toBe(true);
        expect(rendered.count()).toBe(source.count());
        if (type === 'Polygon') {
            expect(rendered.index()).toBe(source.index());
            expect((rendered.groups[0] as ElementsDrawCmd).index.type).toBe(5125);
        } else {
            expect(() => rendered.index()).toThrow('finalized');
        }
        expect(rendered.finalize(type)).toBe(rendered);
        expect(rendered.groups).toHaveLength(1);
        expect(() => rendered.setArray(0, 3)).toThrow('finalized');
        expect(() => rendered.setIdOffset('late')).toThrow('finalized');
    });

    it('preserves resolved references and excludes specialized models and terrain', () => {
        const point = new PointBuffer();
        point.addPoint(0, 0, 0);
        point.heightMapRef = {terrainTileKey: 123, geometryTileKey: 12, transform: new Float32Array([0, 0, 1])};
        point.finalize('Circle');
        expect(point.toRenderBuffer().heightMapRef).toBe(point.heightMapRef);
        for (const [source, type] of [
            [new ModelBuffer(geometry()), 'Model'], [new TerrainModelBuffer(geometry()), 'Terrain']
        ] as const) {
            expect(() => source.toRenderBuffer()).toThrow('Finalize');
            source.addInstance(0, 0, 0);
            source.finalize(type);
            expect(source.toRenderBuffer()).toBe(source);
        }
    });

    it('transfers texture ownership without acquiring or releasing resources again', () => {
        const renderer = new GLRender({});
        renderer.init(document.createElement('canvas'), 1, new HeightMapTileCache());
        const texture = new Texture(renderer.device, {
            data: new Uint8Array([255, 0, 0, 255]), width: 1, height: 1
        });
        const destroy = vi.spyOn(texture, 'destroy');
        let rendered: GeometryBuffer | undefined;
        try {
            const source = new SymbolBuffer(true, 256);
            source.getPositionAttribute().data.push(0, 0, 1, 0, 0, 1);
            source.addUniform('u_texture', texture);
            source.finalize('Icon');
            const ref = texture.ref;
            rendered = source.toRenderBuffer();
            expect(rendered.getUniform('u_texture')).toBe(texture);
            expect(texture.ref).toBe(ref);
            expect(destroy).not.toHaveBeenCalled();
        } finally {
            if (rendered) renderer.releaseGeometryBuffer(rendered);
            else texture.destroy();
            renderer.destroy();
        }
        expect(texture.ref).toBe(0);
        expect(destroy).toHaveBeenCalledTimes(1);
    });
});

describe('Unified buffer lifecycle', () => {
    it('couples batch discriminators to specialized buffer and resolved-style contracts', () => {
        expectTypeOf<BufferBatch<'Text'>['buffer']>().toEqualTypeOf<TextBuffer | undefined>();
        expectTypeOf<BufferBatch<'Text'>['resolvedStyle']>().toEqualTypeOf<TextBufferStyle>();
        expectTypeOf<BufferBatch<'Terrain'>['buffer']>().toEqualTypeOf<GeometryBufferBucket<TerrainModelBuffer> | undefined>();
        expectTypeOf<SymbolBuffer>().not.toExtend<NonNullable<BufferBatch<'Text'>['buffer']>>();
        expectTypeOf<ReturnType<FeatureBufferBuildTask['onDone']>>().toEqualTypeOf<{
            buffers: GeometryBuffer[];
            pendingResources: Promise<any>[];
        }>();
    });

    it('treats a bucket as empty only when none of its buffers has geometry', () => {
        const bucket = new GeometryBufferBucket<PointBuffer>();
        const empty = new PointBuffer(true, 256);
        const populated = new PointBuffer(true, 256);
        populated.addPoint(10, 20, 0);
        expect(bucket.isEmpty()).toBe(true);
        bucket.push(empty);
        expect(bucket.isEmpty()).toBe(true);
        bucket.push(populated);
        expect(bucket.isEmpty()).toBe(false);
        expect(bucket.length).toBe(2);
        expect(bucket.pop()).toBe(populated);
        expect(bucket.isEmpty()).toBe(true);
        expect(bucket.length).toBe(1);
        expect(bucket.pop()).toBe(empty);
        expect(bucket.pop()).toBeUndefined();
        expect(bucket.length).toBe(0);
    });

    it('finalizes the same specialized instance and preserves descriptor references', () => {
        const buffer = new PointBuffer(true, 256);
        buffer.addPoint(10, 20, 0);
        buffer.setIdOffset('point');
        const attribute = buffer.flexAttributes.a_position;
        const uniform = buffer.getUniform('u_normalizePosition');
        const result = buffer.finalize('Circle');
        expect(result).toBe(buffer);
        expect(result).toBeInstanceOf(GeometryBuffer);
        expect(result).toBeInstanceOf(PointBuffer);
        expect(result.rayIntersects).toBe(PointBuffer.prototype.rayIntersects);
        expect(result.attributes.a_position).toBe(attribute);
        expect(result.getUniform('u_normalizePosition')).toBe(uniform);
        expect(result.anchoredPixelSize).toBe(true);
        expect(result.flexAttributes).toBeNull();
    });

    it('finalizes once without duplicate draw commands, trimming or reference acquisition', () => {
        const buffer = new PolygonBuffer();
        buffer.flexAttributes.a_position.data.push(0, 0, 1, 0, 0, 1);
        buffer.setIndex([0, 1, 2]);
        const trim = vi.spyOn(buffer.flexAttributes.a_position.data, 'trim');
        buffer.finalize('Polygon');
        const data = (buffer.attributes.a_position as Attribute).data;
        const group = buffer.groups[0] as ElementsDrawCmd;
        expect(buffer.index()).toBe(group.index.data);
        expect(buffer.finalize('Polygon')).toBe(buffer);
        expect(buffer.groups).toHaveLength(1);
        expect((buffer.attributes.a_position as Attribute).data).toBe(data);
        expect(trim).toHaveBeenCalledTimes(1);
        expect(() => buffer.setIndex([0, 1, 2])).toThrow('finalized');
        expect(() => buffer.setArray(0, 3)).toThrow('finalized');
    });

    it('does not finalize an empty indexed buffer and leaves it buildable', () => {
        const buffer = new PolygonBuffer();
        buffer.setIndex([]);
        expect(buffer.finalize('Polygon')).toBeNull();
        expect(buffer.groups).toHaveLength(0);
        buffer.flexAttributes.a_position.data.push(0, 0, 1, 0, 0, 1);
        buffer.setIndex([0, 1, 2]);
        expect(buffer.finalize('Polygon')).toBe(buffer);
    });

    it('preserves direct render-only buffers and 32-bit indices', () => {
        const index = new Uint32Array([0, 65536, 65537]);
        const buffer = new GeometryBuffer(index, 'Polygon');
        expect(buffer.hasIndex()).toBe(true);
        expect(buffer.index()).toBe(index);
        expect(new GeometryBuffer({first: 2, count: 4}, 'Line').count()).toBe(4);
        expect((buffer.groups[0] as ElementsDrawCmd).index.data).toBe(index);
        expect((buffer.groups[0] as ElementsDrawCmd).index.type).toBe(5125);
        expect(buffer.finalize('Polygon')).toBe(buffer);
        expect(buffer.groups).toHaveLength(1);
    });

    it('invalidates shader feature caches when attributes and height requirements change', () => {
        const buffer = new GeometryBuffer();
        buffer.macroMask = 123;
        buffer.addAttribute('a_position', {data: new Float32Array(3), size: 3});
        expect(buffer.macroMask).toBeUndefined();
        buffer.macroMask = 123;
        buffer.setRequiresHeightMap(true);
        expect(buffer.requiresHeightMap()).toBe(true);
        expect(buffer.flat).toBe(false);
        expect(buffer.macroMask).toBeUndefined();
    });

    it('rejects all construction entry points after finalization without changing render data', () => {
        const point = new PointBuffer(false, 256);
        point.addPoint(10, 20, 0);
        point.finalize('Circle');
        const attribute = point.attributes.a_position as Attribute;
        const data = attribute.data.slice();
        expect(() => point.addPoint(30, 40, 0)).toThrow('finalized');
        expect(() => point.getPositionAttribute()).toThrow('finalized');
        expect(() => point.setIdOffset('late')).toThrow('finalized');
        expect(() => point.index()).toThrow('finalized');
        expect(point.hasIndex()).toBe(false);
        expect(attribute.data).toStrictEqual(data);
        expect(point.count()).toBe(6);
        for (const buffer of [new TextBuffer(true, 256), new SymbolBuffer(true, 256),
            new LineBuffer(), new PolygonBuffer(), new ModelBuffer(geometry()), new HeatmapBuffer(true, 256)]) {
            buffer.finalize('Test');
            expect(() => buffer.setIdOffset('late')).toThrow('finalized');
            if (buffer instanceof TextBuffer) {
                expect(() => buffer.addText(0, 0, 0, [], undefined, 0, 0, 'Center')).toThrow('finalized');
            }
            if (buffer instanceof SymbolBuffer) {
                expect(() => buffer.addIcon(0, 0, 0, undefined, 10, 10)).toThrow('finalized');
            }
            if (buffer instanceof HeatmapBuffer) {
                expect(() => buffer.addPoint(0, 0, 1)).toThrow('finalized');
            }
        }
        point.addUniform('u_opacity', 0.5);
        point.setRequiresHeightMap(true);
        expect(point.getUniform('u_opacity')).toBe(0.5);
        expect(point.requiresHeightMap()).toBe(true);
    });

    it('shares the default model orientation without sharing mutable instance transforms', () => {
        const first = new ModelBuffer(geometry());
        first.addInstance(0, 0, 0, [2, 3, 4], [10, 20, 30]);
        const second = new ModelBuffer(geometry());
        second.addInstance(0, 0, 0);
        first.finalize('Model');
        second.finalize('Model');
        const matrix = (second.attributes.a_modelMatrix as Attribute).data;
        expect(Array.from(matrix)).toStrictEqual([
            1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1
        ]);
        expect((first.attributes.a_modelMatrix as Attribute).data).not.toBe(matrix);
        expect((first.attributes.a_modelMatrix as Attribute).data).toHaveLength(16);
    });

    it('finalizes real synthetic terrain wrappers once while preserving shared geometry and pooling', () => {
        const renderer = new GLRender({});
        const cache = new HeightMapTileCache();
        renderer.init(document.createElement('canvas'), 1, cache);
        const release = vi.fn((buffer: GeometryBuffer) => renderer.releaseSyntheticTerrainBuffer(buffer));
        const planner = new TerrainFBOPlanner(cache, 4096, renderer.device, release);
        try {
            const pool = planner['syntheticPool'];
            const first = pool.acquire();
            const second = pool.acquire();
            expect(first).toBeInstanceOf(TerrainModelBuffer);
            if (!(first instanceof TerrainModelBuffer)) throw new Error('Synthetic terrain lost its specialization');
            expect(first.flexAttributes).toBeNull();
            expect(first.count()).toBeGreaterThan(0);
            expect(first.isEmpty()).toBe(false);
            expect(first.index()).toBe((first.groups[0] as ElementsDrawCmd).index.data);
            expect(first.attributes.a_position).toBe(second.attributes.a_position);
            expect(first.index()).toBe(second.index());
            const source = new TerrainModelBuffer(geometry());
            source.addInstance(0, 0, 0);
            source.finalize('Terrain');
            planner['configureSyntheticBuffer'](first, '1220', '122', source);
            const ref = first.attributes.a_position;
            release(first);
            pool.release(first);
            const reused = pool.acquire();
            expect(reused).toBe(first);
            planner['configureSyntheticBuffer'](reused, '1230', '123', source);
            expect(first.finalize('Terrain')).toBe(first);
            expect(first.groups).toHaveLength(1);
            expect(first.attributes.a_position).toBe(ref);
            expect(first.cullFace()).toBe(0);
            expect(() => first.addInstance(0, 0, 0)).toThrow('finalized');
            release(second);
            pool.release(second);
            pool.release(reused);
            renderer.releaseGeometryBuffer(source);
        } finally {
            planner.destroy();
            renderer.destroy();
        }
    });

    it('retains shared instance attributes across parts without duplicate trimming', () => {
        const first = new ModelBuffer(geometry());
        const second = new ModelBuffer(geometry(), undefined,
            first.flexAttributes.a_modelMatrix, first.flexAttributes.a_offset);
        const bucket = new GeometryBufferBucket<ModelBuffer>();
        bucket.push(first);
        bucket.push(second);
        first.addInstance(1, 2, 3);
        second.instances = first.instances;
        bucket.setIdOffset('model');
        const trim = vi.spyOn(first.flexAttributes.a_modelMatrix.data, 'trim');
        first.finalize('Model');
        second.finalize('Model');
        expect(first.attributes.a_modelMatrix).toBe(second.attributes.a_modelMatrix);
        expect(first.attributes.a_offset).toBe(second.attributes.a_offset);
        expect(first.idOffsets).toStrictEqual(second.idOffsets);
        expect(trim).toHaveBeenCalledTimes(1);
        expect(() => first.addInstance(0, 0, 0)).toThrow('finalized');
    });

    it('fresh construction after a rebuild does not reuse finalized data or caches', () => {
        const create = (altitude: number) => {
            const buffer = new ModelBuffer(geometry());
            buffer.bbox = geometry().bbox;
            buffer.addInstance(0, 0, altitude);
            return buffer.finalize('Model');
        };
        const first = create(1);
        const second = create(50);
        expect(first.uid).not.toBe(second.uid);
        expect(first.attributes.a_modelMatrix).not.toBe(second.attributes.a_modelMatrix);
        expect(first.getHeightBounds(1)).not.toBe(second.getHeightBounds(1));
        expect(first.getHeightBounds(1)[0]).toBe(1);
        expect(second.getHeightBounds(1)[0]).toBe(50);
    });

    it('restarts construction and hands off render-only base buffers', () => {
        const renderer = new GLRender({});
        renderer.init(document.createElement('canvas'), 1, new HeightMapTileCache());
        const factory = new FeatureBufferBuilder(renderer.device, null, 1);
        const provider = new LocalProvider();
        const layer = new TileLayer({provider});
        layer.setStyle({styleGroups: {point: [{zIndex: 0, type: 'Circle', radius: 5, fill: '#ff0000', collide: true}]},
            assign: () => 'point'});
        const tile = new Tile('12222222222222', 'vector', true);
        tile.data = Array.from({length: 32}, (_, id) => layer.addFeature({
            id, type: 'Feature', geometry: {type: 'Point', coordinates: [
                (tile.bounds[0] + tile.bounds[2]) / 2, (tile.bounds[1] + tile.bounds[3]) / 2
            ]}, properties: {}
        }));
        const task = new FeatureBufferBuildTask({builder: factory});
        const input = {tile, displayLayer: new Layer(layer, new Layers())};
        const results: GeometryBuffer[] = [];
        try {
            const interrupted = task.init(input);
            expect(task.exec(interrupted)).toBe(true);
            for (let rebuild = 0; rebuild < 2; rebuild++) {
                const fresh = task.init(input);
                expect(fresh.batchesByZIndex).not.toBe(interrupted.batchesByZIndex);
                expect(fresh.featureIndex).toBe(0);
                while (task.exec(fresh)) {/* Drain the actual task chunks. */}
                const source = fresh.batchesByZIndex['0'].batches[0].buffer;
                if (!(source instanceof GeometryBuffer)) throw new Error('Expected a single scene buffer.');
                const uniformValue = [0.25, 0.5];
                source.addUniform('u_handoff', uniformValue);
                const uniforms = source.uniforms;
                const uniformKeys = Object.keys(uniforms);
                const compiledUniforms = source.getUniformData();
                const result = task.onDone(fresh);
                expect(result.buffers).toHaveLength(1);
                expect(Object.getPrototypeOf(result.buffers[0])).toBe(GeometryBuffer.prototype);
                expect(result.buffers[0].count()).toBe(32 * 6);
                const rendered = result.buffers[0];
                expect(rendered.uniforms).not.toBe(uniforms);
                expect(Object.keys(rendered.uniforms).slice(0, uniformKeys.length)).toStrictEqual(uniformKeys);
                for (const key of uniformKeys) expect(rendered.uniforms[key]).toBe(uniforms[key]);
                expect(rendered.getUniformData()).not.toBe(compiledUniforms);
                expect(rendered.compileUniforms(0).uniforms.u_handoff).toBe(uniformValue);
                expect(rendered.compileUniforms(0).fromCache).toBe(true);
                expect(rendered.rayIntersects).toBe(source.rayIntersects);
                results.push(...result.buffers);
            }
            expect(results[0]).not.toBe(results[1]);
            expect(results[0].attributes.a_position).not.toBe(results[1].attributes.a_position);
        } finally {
            results.forEach((buffer) => renderer.releaseGeometryBuffer(buffer));
            provider.clear();
            factory.destroy();
            renderer.destroy();
        }
    });

    it('balances shared model resources across rebuilds and releases the final texture exactly once', () => {
        const renderer = new GLRender({});
        renderer.init(document.createElement('canvas'), 1, new HeightMapTileCache());
        const resources = new ModelResourceCache(renderer.device);
        const factory = new ModelBufferFactory(resources);
        const model = resources.initModel('shared', {
            geometries: [geometry()],
            faces: [{geometryIndex: 0, material: 'surface'}, {geometryIndex: 0, material: 'surface'}],
            materials: {surface: {diffuseMap: 'color'}},
            textures: {color: {data: new Uint8Array([255, 0, 0, 255]), width: 1, height: 1}}
        });
        if (!model) throw new Error('Model fixture failed to initialize');
        const texture = model.parts[0].uniforms.diffuseMap as Texture;
        const destroy = vi.spyOn(texture, 'destroy');
        const build = () => {
            const bucket = factory.createModelBuffer('shared', undefined, undefined, undefined, undefined);
            factory.addPosition(bucket, 0, 0, 0);
            return bucket.toArray().map((buffer) => buffer.finalize('Model'));
        };
        const anchor = build();
        try {
            expect(anchor[0].cullFace()).toBe(0);
            const ref = texture.ref;
            for (let rebuild = 0; rebuild < 3; rebuild++) {
                const next = build();
                expect(next[0].attributes.a_position).toBe(anchor[0].attributes.a_position);
                const attribute = next[0].attributes.a_position as Attribute;
                const refs = attribute.ref;
                next[0].finalize('Model');
                expect(attribute.ref).toBe(refs);
                next.forEach((buffer) => renderer.releaseGeometryBuffer(buffer));
                expect(texture.ref).toBe(ref);
                expect(destroy).not.toHaveBeenCalled();
            }
        } finally {
            anchor.forEach((buffer) => renderer.releaseGeometryBuffer(buffer));
            resources.destroy();
            renderer.destroy();
        }
        expect(texture.ref).toBe(0);
        expect(destroy).toHaveBeenCalledTimes(1);
        expect(resources.getModel('shared')).toBeUndefined();
    });

    it.each([false, true])('retains a whole model through partial release and rebuild (shared geometry: %s)', (shared) => {
        const renderer = new GLRender({});
        renderer.init(document.createElement('canvas'), 1, new HeightMapTileCache());
        const resources = new ModelResourceCache(renderer.device);
        const factory = new ModelBufferFactory(resources);
        const mesh = geometry();
        const model = resources.initModel('partial', {
            geometries: [mesh, shared ? mesh : geometry()],
            faces: [{geometryIndex: 0, material: 'a'}, {geometryIndex: 1, material: 'b'}],
            materials: {a: {diffuseMap: 'color'}},
            textures: {color: {width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255])}}
        });
        if (!model) throw new Error('Model fixture failed to initialize');
        const build = () => {
            const bucket = factory.createModelBuffer('partial', undefined, undefined, undefined, undefined);
            factory.addPosition(bucket, 0, 0, 0);
            return bucket.toArray().map((buffer) => buffer.finalize('Model'));
        };
        const anchor = build();
        const attribute = anchor[0].attributes.a_position;
        const gpuBuffer = renderer.device.gl.createBuffer();
        renderer['buffers'].set(attribute, gpuBuffer);
        attribute.dirty = false;
        const texture = model.parts[0].uniforms.diffuseMap as Texture;
        const remaining = new Set(anchor);
        try {
            expect(anchor[0].attributes.a_modelMatrix.ref).toBe(2);
            expect(anchor[0].attributes.a_offset.ref).toBe(2);
            if (shared) expect(anchor[0].attributes.a_position).toBe(anchor[1].attributes.a_position);
            renderer.releaseGeometryBuffer(anchor[0]);
            remaining.delete(anchor[0]);
            expect(resources.getModel('partial')).toBe(model);
            expect(anchor[1].attributes.a_modelMatrix.ref).toBe(1);
            expect(renderer['buffers'].has(attribute)).toBe(shared);
            expect(attribute.dirty).toBe(!shared);
            expect(texture.isDestroyed()).toBe(true);
            const rebuilt = build();
            rebuilt.forEach((buffer) => remaining.add(buffer));
            expect(rebuilt[1].attributes.a_position).toBe(anchor[1].attributes.a_position);
            expect(texture.isDestroyed()).toBe(false);
            // Release the non-first part of the new bucket before its first part.
            for (const buffer of [rebuilt[1], anchor[1], rebuilt[0]]) {
                renderer.releaseGeometryBuffer(buffer);
                remaining.delete(buffer);
                expect(resources.getModel('partial')).toBe(remaining.size ? model : undefined);
            }
        } finally {
            remaining.forEach((buffer) => renderer.releaseGeometryBuffer(buffer));
            resources.destroy();
            renderer.destroy();
        }
    });

    it('allocates model fallback textures lazily and releases unused prepared models on cache destruction', () => {
        const renderer = new GLRender({});
        renderer.init(document.createElement('canvas'), 1, new HeightMapTileCache());
        const gl = renderer.device.gl;
        const created = vi.spyOn(gl, 'createTexture');
        const deleted = vi.spyOn(gl, 'deleteTexture');
        const resources = new ModelResourceCache(renderer.device);
        try {
            expect(created).not.toHaveBeenCalled();
            resources.initModel('unused', {
                geometries: [geometry()], faces: [{geometryIndex: 0, material: 'a'}],
                materials: {a: {diffuseMap: 'color'}},
                textures: {color: {width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255])}}
            });
            expect(created).toHaveBeenCalledTimes(3);
            resources.destroy();
            resources.destroy();
            expect(deleted).toHaveBeenCalledTimes(3);
        } finally {
            resources.destroy();
            created.mockRestore();
            deleted.mockRestore();
            renderer.destroy();
        }
    });

    it('keeps fallback textures alive until active buffers are released after cache destruction', () => {
        const renderer = new GLRender({});
        renderer.init(document.createElement('canvas'), 1, new HeightMapTileCache());
        const resources = new ModelResourceCache(renderer.device);
        const factory = new ModelBufferFactory(resources);
        const model = resources.initModel('active', {
            geometries: [geometry()], faces: [{geometryIndex: 0, material: 'a'}, {geometryIndex: 0, material: 'b'}]
        });
        if (!model) throw new Error('Model fixture failed to initialize');
        const fallback = model.textures.unusedTexture;
        const bucket = factory.createModelBuffer('active', undefined, undefined, undefined, undefined);
        factory.addPosition(bucket, 0, 0, 0);
        const remaining = new Set(bucket.toArray().map((buffer) => buffer.finalize('Model')));
        try {
            resources.destroy();
            expect(fallback.isDestroyed()).toBe(false);
            for (const buffer of [...remaining]) {
                renderer.releaseGeometryBuffer(buffer);
                remaining.delete(buffer);
                expect(fallback.isDestroyed()).toBe(remaining.size === 0);
            }
        } finally {
            remaining.forEach((buffer) => renderer.releaseGeometryBuffer(buffer));
            resources.destroy();
            renderer.destroy();
        }
    });
});

describe('Effective picking height bounds', () => {
    it('preserves the generic ground-to-camera fallback and source-height exaggeration', () => {
        const buffer = new GeometryBuffer();
        expectTypeOf(buffer.getHeightBounds(2)).toEqualTypeOf<readonly number[] | null>();
        expect(buffer.getHeightBounds(2, 123)).toStrictEqual([0, 123]);
        buffer.zRange = [-10, 30];
        const bounds = buffer.getHeightBounds(2);
        expect(bounds).toStrictEqual([-20, 60]);
        expect(buffer.getHeightBounds(3)).toBe(bounds);
        expect(bounds).toStrictEqual([-30, 90]);
    });

    it('transforms every model corner and instance and reuses the exaggeration cache', () => {
        const buffer = new ModelBuffer(geometry());
        buffer.bbox = geometry().bbox;
        buffer.addInstance(1, 2, 10, [2, 3, 4], [4, 5, 6], [0.2, 0.4, 0.6]);
        buffer.addInstance(3, 4, -20, [4, 2, 3], [-3, -4, -5], [0.7, 0.3, 0.1]);
        buffer.finalize('Model');
        const expected = (exaggeration: number) => {
            const matrix = (buffer.attributes.a_modelMatrix as Attribute).data;
            const offsets = (buffer.attributes.a_offset as Attribute).data;
            const heights = [];
            for (let instance = 0; instance < 2; instance++) {
                for (let corner = 0; corner < 8; corner++) {
                    const point = [corner & 1 ? 2 : 0, corner & 2 ? 3 : 0, corner & 4 ? 4 : 0];
                    const m = instance * 16;
                    heights.push(point[0] * matrix[m + 2] + point[1] * matrix[m + 6]
                        + point[2] * matrix[m + 10] + matrix[m + 14] + offsets[instance * 3 + 2] * exaggeration);
                }
            }
            return [Math.min(...heights), Math.max(...heights)];
        };
        const bounds = buffer.getHeightBounds(2);
        expect(bounds.slice(0, 2)).toStrictEqual(expected(2));
        expect(buffer.getHeightBounds(2)).toBe(bounds);
        expect(buffer.getHeightBounds(3)).toBe(bounds);
        expect(bounds.slice(0, 2)).toStrictEqual(expected(3));
    });

    it('does not supply unsafe bounds for terrain-relative or unknown models', () => {
        const buffer = new ModelBuffer(geometry());
        buffer.addInstance(0, 0, 1);
        buffer.finalize('Model');
        expect(buffer.getHeightBounds(1)).toBeNull();
        buffer.bbox = geometry().bbox;
        expect(buffer.getHeightBounds(1)).not.toBeNull();
        buffer.setHeightMapRef(true);
        expect(buffer.getHeightBounds(1)).toBeNull();
    });

    it('keeps terrain metadata and specialization on the rendered object', () => {
        const terrain = new TerrainModelBuffer(geometry());
        terrain.heightMap = {data: new Float32Array([1, 2, 3, 4]), size: 2, min: 1, max: 4};
        terrain.zRange = [1, 4];
        terrain.addInstance(0, 0, 0);
        expect(terrain.finalize('Terrain')).toBe(terrain);
        expect(terrain.getHeightMap()).toBe(terrain.heightMap);
        expect(terrain.rayIntersects).toBe(TerrainModelBuffer.prototype.rayIntersects);
        expect(terrain.getHeightBounds(3)).toStrictEqual([3, 12]);
    });
});
