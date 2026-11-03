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
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {Expression, ExpressionMode, ExpressionParser} from '@here/xyz-maps-common';
import {Feature, LocalProvider, ModelData, ModelStyle, Tile, TileLayer} from '@here/xyz-maps-core';
import {Layer, Layers} from '../../../display/src/displays/Layers';
import {Style} from '../../../display/src/displays/styleTools';
import {Attribute} from '../../../display/src/displays/webgl/buffer/Attribute';
import {BufferStyle, BufferColor, GeometryBuffer, RenderUsage} from '../../../display/src/displays/webgl/buffer/GeometryBuffer';
import {FeatureBufferBuilder} from '../../../display/src/displays/webgl/buffer/factory/FeatureBufferBuilder';
import {FeatureBufferBuildTask} from '../../../display/src/displays/webgl/buffer/factory/FeatureBufferBuildTask';
import {TerrainOcclusionMode, TerrainRenderMode} from '../../../display/src/displays/webgl/buffer/TerrainRenderPolicy';
import {PointBuffer} from '../../../display/src/displays/webgl/buffer/types/PointBuffer';
import {BoxBuffer} from '../../../display/src/displays/webgl/buffer/types/BoxBuffer';
import {SphereBuffer} from '../../../display/src/displays/webgl/buffer/types/SphereBuffer';
import {LineBuffer} from '../../../display/src/displays/webgl/buffer/types/LineBuffer';
import {VerticalLineBuffer} from '../../../display/src/displays/webgl/buffer/types/VerticalLineBuffer';
import {PolygonBuffer} from '../../../display/src/displays/webgl/buffer/types/PolygonBuffer';
import {ExtrudeBuffer} from '../../../display/src/displays/webgl/buffer/types/ExtrudeBuffer';
import {TextBuffer} from '../../../display/src/displays/webgl/buffer/types/TextBuffer';
import {SymbolBuffer} from '../../../display/src/displays/webgl/buffer/types/SymbolBuffer';
import {DEFAULT_HEATMAP_GRADIENT, HeatmapBuffer} from '../../../display/src/displays/webgl/buffer/types/HeatmapBuffer';
import {ModelBuffer} from '../../../display/src/displays/webgl/buffer/types/ModelBuffer';
import {TerrainModelBuffer} from '../../../display/src/displays/webgl/buffer/types/TerrainModelBuffer';
import {createGridTileBuffer} from '../../../display/src/displays/webgl/buffer/debugTileBuffer';
import {GLRender} from '../../../display/src/displays/webgl/GLRender';
import {HeightMapTileCache} from '../../../display/src/displays/webgl/HeightMapTileCache';
import {GlyphTexture} from '../../../display/src/displays/webgl/GlyphTexture';
import {Texture} from '../../../display/src/displays/webgl/Texture';
import {PASS} from '../../../display/src/displays/webgl/RenderPass';
import {
    encodeBatchValue, getBatchStateKey, getStrokeStyleKey, getFillStrokeStyleKey, getOffsetStyleKey, getPaintColorIdentity
} from '../../../display/src/displays/webgl/buffer/batchKey';
import {getPointBatchKey as getPointStyleKey} from '../../../display/src/displays/webgl/buffer/types/PointBuffer';

function style(overrides?: Partial<Omit<BufferStyle, 'fill'>> & {fill?: BufferColor}): BufferStyle & {fill: BufferColor};
function style(overrides: Partial<BufferStyle>): BufferStyle;
function style(overrides: Partial<BufferStyle> = {}): BufferStyle {
    return {
        altitude: false, terrainRenderMode: TerrainRenderMode.NONE, terrainOcclusion: TerrainOcclusionMode.NONE,
        unit: 'px', font: '12px monospace', fill: [1, 0, 0, 1], fillIntensity: 1, opacity: 1,
        stroke: undefined, strokeWidth: undefined, strokeLinecap: 'round', strokeLinejoin: 'round',
        strokeDasharray: undefined, strokeDashimage: undefined, width: 4, height: 8, depth: 6, rotation: 30,
        offsetX: 0, offsetY: 0, offsetZ: 0, offsetUnit: undefined, alignment: 'viewport',
        modelMode: null, scaleByAltitude: false, light: undefined, shininess: undefined,
        specular: undefined, emissive: undefined, ...overrides
    };
}

function expression(json: Parameters<ExpressionParser['evaluate']>[0]): Expression {
    const result = new ExpressionParser({}, {zoom: 14}).evaluate(json, {}, ExpressionMode.dynamic);
    if (!(result instanceof Expression)) throw new Error('Expected a dynamic expression');
    return result;
}

const geometry = () => ({
    position: [0, 0, 0, 2, 0, 0, 0, 3, 4],
    normal: [0, 1, 0, 0, 1, 0, 0, 1, 0],
    index: [0, 1, 2], bbox: [0, 0, 0, 2, 3, 4]
});

function withFactory(
    create: (layer: TileLayer, tile: Tile) => Feature[],
    check: (data: ReturnType<FeatureBufferBuildTask['init']>, buffers: GeometryBuffer[], factory: FeatureBufferBuilder, renderer: GLRender) => void
) {
    const renderer = new GLRender({});
    renderer.init(document.createElement('canvas'), 1, new HeightMapTileCache());
    const factory = new FeatureBufferBuilder(renderer.device, null, 1);
    const provider = new LocalProvider();
    const layer = new TileLayer({provider});
    const tile = new Tile('12222222222222', 'vector', true);
    tile.provider = provider;
    let buffers: GeometryBuffer[] = [];
    try {
        tile.data = create(layer, tile);
        const task = new FeatureBufferBuildTask({builder: factory});
        const data = task.init({tile, displayLayer: new Layer(layer, new Layers())});
        while (task.exec(data)) {/* Drain real feature chunks. */}
        const result = task.onDone(data);
        buffers = result.buffers;
        expect(result.pendingResources).toHaveLength(0);
        check(data, buffers, factory, renderer);
    } finally {
        buffers.forEach((buffer) => renderer.releaseGeometryBuffer(buffer));
        provider.clear();
        factory.destroy();
        renderer.destroy();
    }
}

const center = (tile: Tile) => [
    (tile.bounds[0] + tile.bounds[2]) / 2, (tile.bounds[1] + tile.bounds[3]) / 2, 10
];

beforeAll(async () => {
    await document.fonts.load('12px monospace');
});
afterEach(() => vi.restoreAllMocks());

describe('Buffer-owned geometry keys and shared encoders', () => {
    const gradient = {type: 'LinearGradient' as const, stops: {0: 'blue', 1: 'red'}};
    const cases: {name: string; key: () => string; expected: string}[] = [
        {name: 'zero circle radius', key: () => PointBuffer.getCircleGeometryKey(false, 'px', 0), expected: 'Cp:0'},
        {name: 'altitude circle', key: () => PointBuffer.getCircleGeometryKey(true, 'm', 5), expected: 'ACm:5'},
        {name: 'rectangle', key: () => PointBuffer.getRectangleGeometryKey(false, 30, 'px', 4, 8), expected: 'R30:p:4:8'},
        {name: 'polygon', key: () => PolygonBuffer.getGeometryKey(), expected: 'P'},
        {name: 'extrude', key: () => ExtrudeBuffer.getGeometryKey(), expected: 'E'},
        {name: 'box', key: () => BoxBuffer.getGeometryKey(30), expected: 'B30'},
        {name: 'sphere', key: () => SphereBuffer.getGeometryKey(5), expected: 'S5:p'},
        {name: 'raw vertical-line offset', key: () => VerticalLineBuffer.getGeometryKey('-2m'), expected: 'VL3:-2m'},
        {name: 'text font', key: () => TextBuffer.getGeometryKey('12px monospace'), expected: 'T14:12px monospace'},
        {name: 'missing text font', key: () => TextBuffer.getGeometryKey(undefined), expected: 'T1:*'},
        {name: 'icon alignment', key: () => SymbolBuffer.getGeometryKey(true, 'viewport'), expected: 'AI8:viewport'},
        {name: 'plain line', key: () => LineBuffer.getGeometryKey(false, 'px', 0, 'px', 'round', 'round'), expected: 'Lp:0:p:5:round5:round'},
        {name: 'terrain dashed line', key: () => LineBuffer.getGeometryKey('terrain', 'm', -2, 'm', 'butt', 'bevel',
            {pattern: [4, 2], units: ['m', 'px']}), expected: 'TLm:-2:m:4:butt5:beveln4;1:mn2;2:px'},
        {name: 'heatmap', key: () => HeatmapBuffer.getGeometryKey(16, gradient, 0.8),
            expected: 'H16:' + JSON.stringify(gradient) + ':0.8'}
    ];
    for (const test of cases) {
        it(`encodes the ${test.name} key`, () => expect(test.key()).toBe(test.expected));
    }

    it('keeps full dash-image identity, including matching suffixes', () => {
        expect(LineBuffer.getDashImageBatchKey('/a/abcd1234')).not.toBe(LineBuffer.getDashImageBatchKey('/b/abcd1234'));
        expect(LineBuffer.getDashImageBatchKey(undefined)).toBe('u;');
    });

    it('uses expression identity without evaluating or allocating a replacement expression', () => {
        const radius = expression(['+', 2, ['zoom']]);
        vi.spyOn(radius, 'id').mockReturnValue('radius-key');
        const resolve = vi.spyOn(radius, 'resolve');
        expect(PointBuffer.getCircleGeometryKey(false, 'px', radius)).toBe('Cp:e10:radius-key');
        expect(GeometryBuffer.getSizeBatchKey(radius)).not.toBe('radius-key');
        expect(resolve).not.toHaveBeenCalled();
    });

    it('preserves model identity, alpha/debug configuration and terrain/clip prefixes', () => {
        const modelStyle: ModelStyle = {type: 'Model', zIndex: 0, model: 'mesh.obj', modelId: 7, alphaMode: 'mask', alphaCutoff: 0.25};
        const payload = JSON.stringify([7, 'mesh.obj', JSON.stringify(['mask', 0.25, undefined]), true, [1, 0, 1]]);
        expect(ModelBuffer.getGeometryKey(modelStyle, 'mesh.obj', true, [1, 0, 1], true)).toBe('M' + payload + 'TC');
        expect(TerrainModelBuffer.getGeometryKey(modelStyle, 'mesh.obj', true, [1, 0, 1])).toBe('T' + payload);
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.125);
        const anonymous: ModelStyle = {type: 'Model', zIndex: 0, model: 'mesh.obj'};
        expect(ModelBuffer.getGeometryKey(anonymous, 'mesh.obj')).toBe('M[0.125,"mesh.obj","",null,null]');
        expect(ModelBuffer.getGeometryKey(anonymous, 'mesh.obj')).toBe('M[0.125,"mesh.obj","",null,null]');
        expect(random).toHaveBeenCalledTimes(1);
    });

    it('keeps raw colors and distinguishes zero width from a default width', () => {
        expect(getStrokeStyleKey(undefined, 0)).toBe('S0:0:');
        expect(getStrokeStyleKey(undefined, 0)).not.toBe(getStrokeStyleKey(undefined, undefined));
        expect(getFillStrokeStyleKey(getPaintColorIdentity([1, 0, 0]), 2, '#00ff00')).toBe('S2:5:1,0,0F7:#00ff00');
        expect(HeatmapBuffer.getGeometryKey(16, gradient, 1)).not.toBe(
            HeatmapBuffer.getGeometryKey(16, {...gradient, stops: {0: 'red', 1: 'blue'}}, 1));
        expect(getBatchStateKey(TerrainRenderMode.ONSCREEN, TerrainOcclusionMode.TERRAIN,
            1, 0, false, false, false)).toBe('F25:0:');
        expect(getPointStyleKey(undefined, 0, undefined, false, 'map', 0, 0, 0, 'px', 'px', 'px')).toBe('P34:0');
        expect(getPointStyleKey(undefined, 0, undefined, true, undefined, 0, 0, 0, 'px', 'px', 'px')).toBe('P33:0');
    });

    it('preserves JSON escaping, numeric model identities and explicit false debug flags', () => {
        const sourceId = 'mesh"\\\n.obj';
        for (const modelId of [1, -7, 1e20, Infinity]) {
            const shared: ModelStyle = {type: 'Model', zIndex: 0, model: sourceId, modelId};
            const payload = JSON.stringify([modelId, sourceId, '', undefined, undefined]);
            expect(ModelBuffer.getGeometryKey(shared, sourceId)).toBe('M' + payload);
            expect(TerrainModelBuffer.getGeometryKey(shared, sourceId)).toBe('T' + payload);
            expect(ModelBuffer.getGeometryKey(shared, sourceId, false, false)).toBe(
                'M' + JSON.stringify([modelId, sourceId, '', false, false]));
        }
    });

    it('separates offsets without truncation, overflow or cross-axis collisions', () => {
        const units = ['px', 'm', 'px'];
        expect(getOffsetStyleKey(1, 2, 3, units[0], units[1], units[2])).toBe('O8704:787457');
        expect(getOffsetStyleKey(256, 0, 0, units[0], units[1], units[2])).not.toBe(
            getOffsetStyleKey(0, 1, 0, units[0], units[1], units[2]));
    });

    it('keeps full opacity precision and independently encodes render flags', () => {
        const mode = TerrainRenderMode.ONSCREEN;
        const occlusion = TerrainOcclusionMode.TERRAIN;
        expect(getBatchStateKey(mode, occlusion, 0.3333, 2, false, undefined, false)).toBe('F16409:2:0.3333:');
        expect(getBatchStateKey(mode, occlusion, 0.5, 2, true, undefined, true)).toBe('F16505:2:0.5:');
        expect(getBatchStateKey(mode, occlusion, 0.5, 2, true, true, false)).toBe('F16409:2:0.5:');
    });
});

describe('Buffer-owned render style configuration', () => {
    it('keeps stroke-only rectangle blending, stroke defaults, rotation and mixed-unit offsets', () => {
        const buffer = new PointBuffer(false, 256);
        buffer.addPoint(10, 20, 30);
        buffer.finalize('Rect');
        const shared = style({fill: undefined, stroke: [0, 0, 1, 1], unit: 'm',
            offsetX: 2, offsetY: 3, offsetZ: 4, offsetUnit: ['m', 'px', 'm'], alignment: 'map',
            terrainRenderMode: TerrainRenderMode.OFFSCREEN, terrainOcclusion: TerrainOcclusionMode.TERRAIN});
        const attribute = buffer.attributes.a_position;
        buffer.configureStyle(shared, 8, GeometryBuffer.hasAlphaColor(shared));
        expect(buffer.attributes.a_position).toBe(attribute);
        expect(buffer.getUniform('u_fill')).toStrictEqual(new Float32Array([-1, -1, -1, -1]));
        expect(buffer.getUniform('u_strokeWidth')).toBe(1);
        expect(buffer.getUniform('u_size')).toStrictEqual([4, 8, 8, 8]);
        expect(buffer.getUniform('u_rotation')).toBe(30 * (Math.PI / 180));
        expect(buffer.getUniform('u_offset')).toStrictEqual([2, 8, 3, 0]);
        expect(buffer.getUniform('u_offsetZ')).toStrictEqual([4, 8]);
        expect(buffer.getUniform('u_alignMap')).toBe(true);
        expect(buffer.pass).toBe(PASS.ALPHA_COLOR);
        expect(buffer.depth).toBeUndefined();
        expect(buffer.blend).toBe(true);
        expect(buffer.renderUsage).toBe(RenderUsage.TERRAIN_PREPASS);
        expect(buffer.terrainOcclusion).toBe(TerrainOcclusionMode.TERRAIN);
    });

    it('keeps dynamic circle radius uniforms and integer stroke-width coercion', () => {
        const buffer = new PointBuffer(true, 256);
        buffer.addPoint(10, 20, 0);
        buffer.finalize('Circle');
        const radius = expression(['+', 2, ['zoom']]);
        const shared = style({width: radius, stroke: [0, 0, 1, 0.5], strokeWidth: 2.8});
        buffer.configureStyle(shared, 8, GeometryBuffer.hasAlphaColor(shared));
        expect(buffer.getUniform('u_strokeWidth')).toBe(2);
        expect(buffer.getUniform('u_radius')).toStrictEqual([radius, 0]);
        expect(buffer.pass).toBe(PASS.ALPHA_COLOR);
        expect(buffer.depth).toBe(true);
    });

    it('keeps box sizing in attributes and sphere radius in uniforms', () => {
        const box = new BoxBuffer();
        const sphere = new SphereBuffer(false);
        const shared = style({width: 5, unit: 'm', alignment: 'map', fill: [1, 0, 0, 0.5]});
        box.configureStyle(shared, 8, true);
        sphere.configureStyle(shared, 8, true);
        expect(box.getUniform('u_size')).toBeUndefined();
        expect(box.getUniform('u_radius')).toBeUndefined();
        expect(box.getUniform('u_rotation')).toBe(30 * (Math.PI / 180));
        expect(sphere.getUniform('u_radius')).toStrictEqual([5, 8]);
        expect(sphere.getUniform('u_rotation')).toBeUndefined();
        expect(sphere.getUniform('u_alignMap')).toBe(true);
    });

    it('keeps dynamic dash/stroke uniforms, alpha-depth and the unlit line path', () => {
        const width = expression(['+', 2, ['zoom']]);
        const dash = expression(['step', ['zoom'], ['literal', [4, 2]], 16, ['literal', [8, 4]]]);
        const shared = style({stroke: [1, 0, 0, 1], strokeWidth: width, unit: 'm', offsetX: 2,
            offsetUnit: 'm', strokeDasharray: {pattern: dash, units: ['m', 'px']},
            emissive: [0.1, 0.2, 0.3], specular: [1, 1, 1], shininess: 8});
        const buffer = new LineBuffer(false);
        buffer.configureStyle(shared, 8, false);
        expect(buffer.type).toBe('DashedLine');
        expect(buffer.getUniform('u_strokeWidth')).toStrictEqual([width, 8]);
        expect(buffer.getUniform('u_dashUnit')).toStrictEqual([8, 0]);
        expect(buffer.getUniform('u_offset')).toStrictEqual([2, 8]);
        expect(buffer.getUniform('specular')).toBeUndefined();
        expect(buffer.getUniform('u_emissive.color')).toBeUndefined();
        expect(buffer.pass).toBe(PASS.ALPHA_COLOR | PASS.ALPHA_DEPTH);
        expect(buffer.depth).toBe(true);
        expect(buffer.blend).toBe(true);
    });

    it('keeps the opaque, flat solid-line color pass without alpha-depth', () => {
        const buffer = new LineBuffer();
        buffer.configureStyle(style({stroke: [1, 0, 0, 1], strokeWidth: 3, offsetUnit: 'px'}), 8, false);
        expect(buffer.pass).toBe(PASS.ALPHA_COLOR);
        expect(buffer.getUniform('u_no_antialias')).toBe(false);
    });

    it('keeps vertical lines separate from polygon fill/alpha configuration', () => {
        const buffer = new VerticalLineBuffer();
        buffer.configureStyle(style({stroke: [0, 0, 1, 0.5], offsetZ: 4, offsetUnit: 'm'}), 8, true);
        expect(buffer.getUniform('u_fill')).toStrictEqual([0, 0, 1, 0.5]);
        expect(buffer.getUniform('u_offsetZ')).toStrictEqual([4, 8]);
        expect(buffer.getUniform('u_fillIntensity')).toBeUndefined();
        expect(buffer.pass).toBe(PASS.OPAQUE);
    });

    it('keeps extrude stroke draw groups and transparent depth passes', () => {
        const buffer = new ExtrudeBuffer();
        buffer.flexAttributes.a_position.data.push(...geometry().position);
        buffer.setIndex([0, 1, 2]);
        buffer.extrudeStrokeIndex = [0, 1, 1, 2, 2, 0];
        buffer.finalize('Extrude');
        buffer.configureStyle(style({stroke: [0, 0, 1, 1], fill: [1, 0, 0, 0.5], fillIntensity: 0.8}), 8, true);
        expect(buffer.groups).toHaveLength(2);
        expect(buffer.groups[1].mode).toBe(GeometryBuffer.MODE_GL_LINES);
        expect(buffer.groups[1].uniforms).toStrictEqual({u_strokePass: 1, u_stroke: [0, 0, 1, 1]});
        expect(buffer.getUniform('u_strokePass')).toBe(0);
        expect(buffer.getUniform('u_fillIntensity')).toBe(0.8);
        expect(buffer.pass).toBe(PASS.ALPHA_COLOR | PASS.ALPHA_DEPTH);
    });

    for (const alphaMode of ['opaque', 'mask', 'blend'] as const) {
        it(`keeps ${alphaMode} model materials, primary point mode zero and shared offsets`, () => {
            const buffer = new ModelBuffer(geometry(), {diffuse: [1, 0, 0], specular: [0.2, 0.3, 0.4],
                shininess: 9, emissive: [0.1, 0.2, 0.3], pointSize: 3});
            buffer.addInstance(0, 0, 10);
            buffer.alphaMode = alphaMode;
            buffer.finalize('Model');
            buffer.configureStyle(style({specular: [1, 1, 1], shininess: 16, emissive: [0.8, 0.8, 0.8],
                offsetX: 2, offsetY: 3, offsetZ: 4, offsetUnit: ['m', 'px', 'm']}), 8, false);
            expect(buffer.getUniform('specular')).toStrictEqual([0.2, 0.3, 0.4]);
            expect(buffer.getUniform('shininess')).toBe(9);
            expect(buffer.getUniform('emissive')).toStrictEqual([0.1, 0.2, 0.3]);
            expect(buffer.getUniform('u_emissive.color')).toBeUndefined();
            expect(buffer.getUniform('u_offset')).toStrictEqual([2, 8, 3, 0]);
            expect(buffer.groups[0].mode).toBe(0);
            expect(buffer.depth).toBe(true);
            expect(buffer.pass).toBe(alphaMode === 'blend' ? PASS.ALPHA_COLOR : PASS.OPAQUE);
            expect(buffer.blend).toBe(alphaMode === 'blend');
        });
    }

    it('keeps terrain lighting overrides, source heights and mesh-only normal fallback', () => {
        const shared = style({modelMode: [-2, 8], specular: [1, 1, 1], shininess: 16, emissive: [0.8, 0.8, 0.8]});
        for (const heightMap of [false, true]) {
            const buffer = new TerrainModelBuffer(geometry(), {specular: [0.2, 0.3, 0.4]});
            delete buffer.flexAttributes.a_normal;
            buffer.addInstance(0, 0, 0);
            if (heightMap) buffer.heightMap = {tileSize: 256, size: 2, data: new Float32Array(4), min: -2, max: 8};
            buffer.finalize('Terrain');
            const normals = vi.spyOn(buffer, 'computeNormals');
            buffer.configureStyle(shared, 8, false);
            expect(normals).toHaveBeenCalledTimes(heightMap ? 0 : 1);
            expect(!!buffer.attributes.a_normal).toBe(!heightMap);
            if (!heightMap) {
                expect((buffer.attributes.a_normal as Attribute).data).toBeInstanceOf(Int8Array);
                expect((buffer.attributes.a_normal as Attribute).normalized).toBe(true);
            }
            expect(buffer.getUniform('u_isPixelCoords')).toBe(true);
            expect(buffer.zRange).toBe(shared.modelMode);
            expect(buffer.getUniform('specular')).toBe(shared.specular);
            expect(buffer.getUniform('shininess')).toBe(16);
            expect(buffer.getUniform('u_emissive.color')).toBe(shared.emissive);
            expect(buffer.createStyleContext(style({showBBox: true}))).toBeUndefined();
        }
    });

    it('preserves resizable finalized grid buffers without weakening construction guards', () => {
        const buffer = createGridTileBuffer(256);
        buffer.setSize(512);
        expect((buffer.attributes.a_position as Attribute).data).toContain(512);
        expect(buffer.finalize('Line')).toBe(buffer);
        expect(buffer.groups).toHaveLength(1);
        expect(() => buffer.setArray(0, 4)).toThrow('finalized');
    });
});

describe('Factory delegation and partition preservation', () => {
    it('builds polygon outlines from frozen shared styles without replacing feature-dependent callbacks', () => {
        const stroke = vi.fn((feature: Feature) => feature.properties.color);
        const strokeWidth = vi.fn((feature: Feature, zoom: number) => feature.properties.width + zoom - 14);
        const shared: Style = Object.freeze({type: 'Polygon', zIndex: 0, fill: 'white', stroke, strokeWidth, collide: true});
        vi.spyOn(Layer.prototype, 'processStyleGroup').mockReturnValue([shared]);
        withFactory((layer, tile) => [4, 6].map((width, id) => {
            const [x, y] = center(tile);
            return layer.addFeature({id, type: 'Feature', geometry: {type: 'Polygon', coordinates: [[
                [x, y], [x + 0.0001, y], [x, y + 0.0001], [x, y]
            ]]}, properties: {width, color: id ? 'blue' : 'red'}});
        }), (_data, buffers) => {
            const outlines = buffers.filter((buffer) => buffer.type === 'Line');
            expect(buffers).toHaveLength(4);
            expect(outlines).toHaveLength(2);
            expect(outlines.map((buffer) => buffer.getUniform('u_strokeWidth')[0]).sort()).toEqual([5, 7]);
            expect(strokeWidth).toHaveBeenCalledTimes(4);
            expect(stroke).toHaveBeenCalledTimes(4);
            expect(strokeWidth.mock.calls.map(([, zoom]) => zoom)).toEqual([15, 15, 15, 15]);
            expect(shared.type).toBe('Polygon');
            expect(shared.stroke).toBe(stroke);
            expect(shared.strokeWidth).toBe(strokeWidth);
        });
    });

    it('leaves polygon styles untouched when an outline callback throws', () => {
        const error = new Error('outline callback failed');
        const stroke = () => 'red';
        const strokeWidth = () => 4;
        const shared: Style = {type: 'Polygon', zIndex: 0, fill: 'white', stroke, strokeWidth,
            strokeLinecap: () => {
                throw error;
            }};
        vi.spyOn(Layer.prototype, 'processStyleGroup').mockReturnValue([shared]);
        expect(() => withFactory((layer, tile) => {
            const [x, y] = center(tile);
            return [layer.addFeature({type: 'Feature', geometry: {type: 'Polygon', coordinates: [[
                [x, y], [x + 0.0001, y], [x, y + 0.0001], [x, y]
            ]]}, properties: {}})];
        }, () => {
            throw new Error('Expected outline construction to fail');
        })).toThrow(error);
        expect(shared.type).toBe('Polygon');
        expect(shared.stroke).toBe(stroke);
        expect(shared.strokeWidth).toBe(strokeWidth);
    });

    for (const emptyPart of ['vertices', 'indices', 'draw range'] as const) {
        it(`keeps renderable model parts when the first material has empty ${emptyPart}`, () => {
            const empty: ModelData['geometries'][number] = emptyPart === 'vertices'
                ? {position: [], normal: [], bbox: [0, 0, 0, 0, 0, 0]} : geometry();
            if (emptyPart === 'indices') empty.index = [];
            if (emptyPart === 'draw range') delete empty.index;
            const model: ModelData & {id: string} = {id: `empty-${emptyPart}`, geometries: [empty, geometry()],
                faces: [
                    {geometryIndex: 0, material: 'empty', count: emptyPart === 'draw range' ? 0 : undefined},
                    {geometryIndex: 1, material: 'visible'}
                ], materials: {empty: {diffuseMap: 'ignored'}, visible: {diffuseMap: 'visible'}},
                textures: {
                    ignored: {data: new Uint8Array([255, 0, 0, 255]), width: 1, height: 1},
                    visible: {data: new Uint8Array([0, 0, 255, 255]), width: 1, height: 1}
                }};
            withFactory((layer, tile) => {
                const feature = layer.addFeature({type: 'Feature', geometry: {type: 'Point', coordinates: center(tile)}, properties: {}});
                const style: ModelStyle = {type: 'Model', zIndex: 0, model};
                layer.setStyleGroup(feature, [style]);
                return [feature];
            }, (_data, buffers, factory, renderer) => {
                expect(buffers).toHaveLength(1);
                expect(buffers[0]).toBeInstanceOf(ModelBuffer);
                expect(buffers[0].count()).toBe(3);
                expect(buffers[0].instances).toBe(1);
                const cached = factory['modelResources'].getModel(model.id);
                if (!cached) throw new Error('Renderable model was discarded');
                expect(cached.parts).toHaveLength(1);
                expect(cached.textures.ignored).toBeUndefined();
                const texture = cached.textures.visible;
                const destroy = vi.spyOn(texture, 'destroy');
                expect(texture.ref).toBe(1);
                renderer.releaseGeometryBuffer(buffers.pop());
                expect(destroy).toHaveBeenCalledTimes(1);
                expect(factory['modelResources'].getModel(model.id)).toBeUndefined();
            });
        });
    }

    const collisionCases: {name: string; common: Style; variants: Partial<Style>[]}[] = [
        {name: 'rectangle dimensions', common: {type: 'Rect', zIndex: 0, fill: 'red', collide: true},
            variants: [{width: 1, height: 23}, {width: 12, height: 3}]},
        {name: 'cross-axis offsets', common: {type: 'Circle', zIndex: 0, radius: 4, fill: 'red', collide: true},
            variants: [{offsetX: 256, offsetY: 0}, {offsetX: 0, offsetY: 1}]},
        {name: 'sub-percent opacity', common: {type: 'Circle', zIndex: 0, radius: 4, fill: 'red', collide: true},
            variants: [{opacity: 0.5}, {opacity: 0.501}]},
        {name: 'fill intensity', common: {type: 'Box', zIndex: 0, width: 4, fill: 'red', collide: true},
            variants: [{fillIntensity: 0.5}, {fillIntensity: 1}]},
        {name: 'lighting property slots', common: {type: 'Box', zIndex: 0, width: 4, fill: 'red', collide: true},
            variants: [{light: 'red'}, {emissive: 'red'}]}
    ];
    for (const {name, common, variants} of collisionCases) {
        it(`splits ${name} while merging independently constructed identical styles`, () => {
            withFactory((layer, tile) => [0, 1, 0, 1].map((variant, id) => {
                const feature = layer.addFeature({id, type: 'Feature',
                    geometry: {type: 'Point', coordinates: center(tile)}, properties: {}});
                layer.setStyleGroup(feature, [{...common, ...variants[variant]}]);
                return feature;
            }), (data, buffers) => {
                expect(data.batchesByZIndex['0'].batches).toHaveLength(2);
                const groups = data.batchesByZIndex['0'].batches;
                expect(Array.isArray(groups[0].resolvedStyle.offsetUnit)).toBe(true);
                expect(groups[0].resolvedStyle.offsetUnit).not.toBe(groups[1].resolvedStyle.offsetUnit);
                expect(buffers).toHaveLength(2);
                expect(buffers.map((buffer) => buffer.idOffsets.length).sort()).toStrictEqual([2, 2]);
            });
        });
    }

    it('delegates point keys/configuration and merges identical raw styles while splitting color/zIndex keys', () => {
        const key = vi.spyOn(PointBuffer, 'getPointBatchKey');
        const configure = vi.spyOn(GeometryBuffer.prototype, 'configureStyle');
        withFactory((layer, tile) => {
            const common: Style = {type: 'Circle', zIndex: 0, radius: 5, fill: '#ff0000', collide: true};
            return Array.from({length: 6}, (_, id) => {
                const feature = layer.addFeature({id, type: 'Feature', geometry: {type: 'Point', coordinates: center(tile)}, properties: {}});
                layer.setStyleGroup(feature, [id === 4 ? {...common, fill: 'red'} : id === 5 ? {...common, zIndex: 1} : common]);
                return feature;
            });
        }, (data, buffers) => {
            expect(data.batchesByZIndex['0'].batches).toHaveLength(2);
            expect(data.batchesByZIndex['1'].batches).toHaveLength(1);
            expect(buffers).toHaveLength(3);
            expect(buffers.map((buffer) => buffer.count()).sort((a, b) => a - b)).toStrictEqual([6, 6, 24]);
            expect(buffers[0].zIndex).toBe(1);
            expect(key).toHaveBeenCalledTimes(6);
            expect(configure).toHaveBeenCalledTimes(3);
            expect(data.batchesByZIndex['0'].batches.every((batch) => batch.buffer instanceof PointBuffer)).toBe(true);
            expect(buffers.every((buffer) => Object.getPrototypeOf(buffer) === GeometryBuffer.prototype &&
                !Object.prototype.hasOwnProperty.call(buffer, 'flexAttributes'))).toBe(true);
        });
    });

    for (const property of ['fill', 'emissive'] as const) {
        it(`preserves ${property} identity when a later style callback mutates its raw color array`, () => {
            const color = [1, 0, 0, 1];
            withFactory((layer, tile) => {
                const common: Style = {type: property === 'fill' ? 'Circle' : 'Box',
                    radius: 5, width: 5, height: 5, depth: 5, fill: 'white', collide: true, zIndex: 0};
                return [0, 1].map((id) => {
                    const feature = layer.addFeature({id, type: 'Feature',
                        geometry: {type: 'Point', coordinates: center(tile)}, properties: {}});
                    layer.setStyleGroup(feature, [{...common, [property]: id === 0 ? color : [0, 0, 1, 1],
                        zIndex: id === 0 ? () => {
                            color[0] = 0;
                            color[2] = 1;
                            return 0;
                        } : 0}]);
                    return feature;
                });
            }, (data, buffers) => {
                const groups = data.batchesByZIndex['0'].batches;
                expect(groups).toHaveLength(2);
                expect(buffers).toHaveLength(2);
                if (property === 'fill') {
                    expect(groups.map((group) => {
                        if (group.type !== 'Circle') throw new Error('Expected a Circle batch');
                        return group.resolvedStyle.fill;
                    })).toEqual([[1, 0, 0, 1], [0, 0, 1, 1]]);
                } else {
                    expect(groups.map((group) => group.resolvedStyle.emissive)).toEqual([[1, 0, 0], [0, 0, 1]]);
                }
            });
        });
    }

    it('preserves width-before-dash expression ID assignment and dynamic-circle identity', () => {
        const assigned: Expression[] = [];
        const id = Expression.prototype.id;
        vi.spyOn(Expression.prototype, 'id').mockImplementation(function(this: Expression) {
            assigned.push(this);
            return id.call(this);
        });
        withFactory((layer, tile) => {
            const [x, y] = center(tile);
            const line = layer.addFeature({id: 'line', type: 'Feature',
                geometry: {type: 'LineString', coordinates: [[x, y], [x + 0.0001, y]]}, properties: {}});
            layer.setStyleGroup(line, [{type: 'Line', zIndex: 0, stroke: 'red', strokeWidth: ['+', 2, ['zoom']],
                strokeDasharray: ['step', ['zoom'], ['literal', [4, 2]], 16, ['literal', [8, 4]]]}]);
            const circle = layer.addFeature({id: 'circle', type: 'Feature', geometry: {type: 'Point', coordinates: [x, y]}, properties: {}});
            layer.setStyleGroup(circle, [{type: 'Circle', zIndex: 0, radius: ['+', 4, ['zoom']], fill: 'red', collide: true}]);
            return [line, circle];
        }, (_data, buffers) => {
            expect(assigned.map((exp) => exp.toJSON())).toStrictEqual([
                ['+', 2, ['zoom']], ['step', ['zoom'], ['literal', [4, 2]], 16, ['literal', [8, 4]]], ['+', 4, ['zoom']]
            ]);
            const line = buffers.find((buffer) => buffer.type === 'DashedLine');
            const circle = buffers.find((buffer) => buffer.type === 'Circle');
            expect(line.getUniform('u_strokeWidth')[0]).toBe(assigned[0]);
            expect(circle.getUniform('u_radius')[0]).toBe(assigned[2]);
        });
    });

    it('keeps differently sized boxes in one batch with per-feature geometry sizing', () => {
        withFactory((layer, tile) => [4, 8].map((width, id) => {
            const feature = layer.addFeature({id, type: 'Feature', geometry: {type: 'Point', coordinates: center(tile)}, properties: {}});
            layer.setStyleGroup(feature, [{type: 'Box', zIndex: 0, width, height: width, depth: width, fill: 'red', collide: true}]);
            return feature;
        }), (data, buffers) => {
            expect(data.batchesByZIndex['0'].batches).toHaveLength(1);
            expect(buffers).toHaveLength(1);
            expect(data.batchesByZIndex['0'].batches[0].buffer).toBeInstanceOf(BoxBuffer);
            expect(Object.getPrototypeOf(buffers[0])).toBe(GeometryBuffer.prototype);
            expect(buffers[0].count()).toBe(72);
            const points = (buffers[0].attributes.a_point as Attribute).data;
            expect(points[0] >> 1).toBe(4);
            expect(points[36 * 3] >> 1).toBe(8);
        });
    });

    it('deduplicates model bounding boxes across material parts within each batch, not across batches', () => {
        const model: ModelData & {id: string} = {id: 'contract-model', geometries: [geometry()],
            materials: {a: {diffuse: [1, 0, 0]}, b: {diffuse: [0, 1, 0]}},
            faces: [{geometryIndex: 0, material: 'a'}, {geometryIndex: 0, material: 'b'}]};
        const models: ModelStyle[] = [1, 2].map((modelId) => ({type: 'Model', model, modelId, zIndex: 0,
            showWireframe: true, showBBox: true, collide: true}));
        withFactory((layer, tile) => [0, 0, 1].map((variant, id) => {
            const feature = layer.addFeature({id, type: 'Feature', geometry: {type: 'Point', coordinates: center(tile)}, properties: {}});
            layer.setStyleGroup(feature, [models[variant]]);
            return feature;
        }), (data, buffers) => {
            expect(data.batchesByZIndex['0'].batches).toHaveLength(2);
            expect(buffers).toHaveLength(4);
            expect(buffers.every((buffer) => buffer.bbox === buffers[0].bbox)).toBe(true);
            for (const instances of [1, 2]) {
                const parts = buffers.filter((buffer) => buffer.instances === instances);
                expect(parts).toHaveLength(2);
                expect(parts[0].attributes.a_modelMatrix).toBe(parts[1].attributes.a_modelMatrix);
                expect(parts.reduce((sum, buffer) => sum + buffer.groups.length, 0)).toBe(5);
            }
        });
    });

    it('synchronizes real glyph textures and preserves missing fill/stroke sentinels', () => {
        const sync = vi.spyOn(GlyphTexture.prototype, 'sync');
        withFactory((layer, tile) => [false, true].map((fill, id) => {
            const feature = layer.addFeature({id, type: 'Feature', geometry: {type: 'Point', coordinates: center(tile)}, properties: {}});
            layer.setStyleGroup(feature, [{type: 'Text', zIndex: 0, text: 'ABC', font: '12px monospace',
                fill: fill ? 'red' : undefined, stroke: fill ? undefined : 'blue', strokeWidth: 1, collide: true}]);
            return feature;
        }), (_data, buffers) => {
            expect(buffers).toHaveLength(2);
            expect(sync).toHaveBeenCalledTimes(2);
            for (const buffer of buffers) {
                expect(buffer.type).toBe('Text');
                expect(Object.getPrototypeOf(buffer)).toBe(GeometryBuffer.prototype);
                const texture = buffer.getUniform('u_texture') as GlyphTexture;
                expect(buffer.getUniform('u_texSize')).toStrictEqual([texture.width, texture.height]);
                expect(texture.width).toBeGreaterThan(0);
                expect(buffer.pass).toBe(PASS.ALPHA_COLOR);
            }
            expect(buffers[0].getUniform('u_strokeColor')).toStrictEqual(new Float32Array([-1, -1, -1, -1]));
            expect(buffers[1].getUniform('u_fillColor')).toStrictEqual(new Float32Array([-1, -1, -1, -1]));
        });
    });

    it('keeps icon opacity/texture alignment and shared heatmap gradient ownership', () => {
        withFactory(() => [], (_data, _buffers, factory, renderer) => {
            const texture = new Texture(renderer.device, {data: new Uint8Array(24), width: 2, height: 3});
            const fontStyle = style({font: '13px monospace', strokeWidth: undefined});
            const glyphs = TextBuffer.createGlyphTexture(renderer.device, fontStyle);
            const icon = new SymbolBuffer(true, 256);
            const first = new HeatmapBuffer(true, 256);
            const second = new HeatmapBuffer(true, 256);
            try {
                expect(fontStyle.strokeWidth).toBe(1);
                expect(() => TextBuffer.createGlyphTexture(renderer.device,
                    style({strokeWidth: expression(['+', 2, ['zoom']])}))).toThrow('resolved');
                icon.addUniform('u_texture', texture);
                icon.configureStyle(style({opacity: 0.6, alignment: 'map'}), 8, false);
                expect(icon.getUniform('u_opacity')).toBe(0.6);
                expect(icon.getUniform('u_texSize')).toStrictEqual([2, 3]);
                expect(icon.getUniform('u_alignMap')).toBe(true);
                expect(icon.getUniform('u_fill')).toBeUndefined();
                const gradient = vi.spyOn(factory.textureManager, 'getGradientTexture');
                const shared = style({fill: undefined, height: undefined, width: 16, opacity: 0.6});
                for (const buffer of [first, second]) {
                    buffer.addPoint(10, 20, 1);
                    buffer.finalize('Heatmap');
                    buffer.configureStyle(shared, 8, false, factory.textureManager);
                    expect(buffer.getUniform('u_intensity')).toBe(1);
                    expect(buffer.pass).toBe(PASS.ALPHA_COLOR | PASS.ALPHA_DEPTH);
                    expect(buffer.flat).toBe(true);
                    expect(buffer.depth).toBe(false);
                    expect(buffer.blend).toBe(false);
                }
                expect(gradient).toHaveBeenCalledWith(DEFAULT_HEATMAP_GRADIENT.stops, HeatmapBuffer.verifyAndFixGradient);
                expect(first.getUniform('u_gradient')).toBe(second.getUniform('u_gradient'));
                expect(() => new HeatmapBuffer(true, 256).configureStyle(shared, 8, false)).toThrow('TextureManager');
            } finally {
                renderer.releaseGeometryBuffer(first);
                renderer.releaseGeometryBuffer(second);
                texture.destroy();
                glyphs.destroy();
            }
        });
    });
});
