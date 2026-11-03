import {afterEach, describe, expect, expectTypeOf, it, vi} from 'vitest';
import {Expression, ExpressionMode, ExpressionParser} from '@here/xyz-maps-common';
import {
    encodeBatchValue, getBatchStateKey, getLightingKeyPart, getOffsetStyleKey,
    getStrokeStyleKey, getFillStrokeStyleKey, getLightingColorIdentity
} from '../../../display/src/displays/webgl/buffer/batchKey';
import {TerrainRenderMode, TerrainOcclusionMode} from '../../../display/src/displays/webgl/buffer/TerrainRenderPolicy';
import {PointBuffer, getPointBatchKey as getPointStyleKey} from '../../../display/src/displays/webgl/buffer/types/PointBuffer';
import {SphereBuffer} from '../../../display/src/displays/webgl/buffer/types/SphereBuffer';
import {TextBuffer} from '../../../display/src/displays/webgl/buffer/types/TextBuffer';
import {LineBuffer} from '../../../display/src/displays/webgl/buffer/types/LineBuffer';
import {BoxBuffer} from '../../../display/src/displays/webgl/buffer/types/BoxBuffer';
import {SymbolBuffer} from '../../../display/src/displays/webgl/buffer/types/SymbolBuffer';
import {PolygonBuffer} from '../../../display/src/displays/webgl/buffer/types/PolygonBuffer';
import {ExtrudeBuffer} from '../../../display/src/displays/webgl/buffer/types/ExtrudeBuffer';
import {VerticalLineBuffer} from '../../../display/src/displays/webgl/buffer/types/VerticalLineBuffer';
import {HeatmapBuffer} from '../../../display/src/displays/webgl/buffer/types/HeatmapBuffer';
import {ModelBuffer} from '../../../display/src/displays/webgl/buffer/types/ModelBuffer';
import {TerrainModelBuffer} from '../../../display/src/displays/webgl/buffer/types/TerrainModelBuffer';
import type {ModelStyle} from '@here/xyz-maps-core';
import CircleProgram from '../../../display/src/displays/webgl/program/Circle';
import type {Attribute} from '../../../display/src/displays/webgl/buffer/Attribute';
import type {LightingColorIdentity} from '../../../display/src/displays/webgl/buffer/batchKey';

describe('Batch key boundaries', () => {
    afterEach(() => vi.restoreAllMocks());
    it('encodes variable string components without adjacent-component collisions', () => {
        const values = [undefined, null, '', 'a:b;', 'null;', 1, '1', -1, 0.01, 2 ** 40];
        const keys = values.flatMap((a) => values.map((b) => encodeBatchValue(a) + encodeBatchValue(b)));
        expect(new Set(keys).size).toBe(values.length ** 2);
    });

    it('separates rectangle dimensions that previously had the same concatenation', () => {
        expect(PointBuffer.getRectangleGeometryKey(false, 0, 'px', 1, 23)).not.toBe(
            PointBuffer.getRectangleGeometryKey(false, 0, 'px', 12, 3));
        expect(SphereBuffer.getGeometryKey(5, 'm')).not.toBe(SphereBuffer.getGeometryKey(5, 'px'));
    });

    it('keeps fractional, negative and large offsets on independent axes', () => {
        const values = [0, 0.125, -0.5, -256, -1, 1, 255, 256, 2 ** 32, 2 ** 40];
        const geometry = PointBuffer.getCircleGeometryKey(true, 'px', 4);
        const state = getBatchStateKey(TerrainRenderMode.ONSCREEN, TerrainOcclusionMode.TERRAIN, 1, 0, true, true, false);
        const keys = values.flatMap((x) => values.flatMap((y) => values.map((z) =>
            PointBuffer.getPointBatchKey(undefined, 1, 'red', true, 'map', x, y, z, 'px', 'm', 'px', state, geometry))));
        expect(new Set(keys).size).toBe(values.length ** 3);
    });

    it('keeps scalar offset components identical between offset-only buffer types', () => {
        for (const x of [0, 1, -256, 256, 0.125]) {
            for (const units of [['px', 'px', 'px'], ['m', 'px', 'm'], ['', 'custom', 'px']]) {
                const offset = getOffsetStyleKey(x, 2, 3, units[0], units[1], units[2]);
                const geometry = SymbolBuffer.getGeometryKey(true, 'map');
                expect(SymbolBuffer.getBatchKey(x, 2, 3, units[0], units[1], units[2], 'F0:', geometry)).toBe('F0:' + offset + geometry);
                const style: ModelStyle = {type: 'Model', zIndex: 0, model: 'mesh.obj', modelId: 7};
                const model = ModelBuffer.getGeometryKey(style, 'mesh.obj');
                expect(ModelBuffer.getBatchKey(model, 'F0:', x, 2, 3, units[0], units[1], units[2])).toBe('F0:' + offset + model);
            }
        }
    });

    it('omits only default zero offsets without merging other representations or lighting boundaries', () => {
        expect(getOffsetStyleKey(0, 0, 0, 'px', 'px', 'px')).toBe('');
        const geometry = ModelBuffer.getGeometryKey({type: 'Model', zIndex: 0, model: 'mesh.obj', modelId: 7}, 'mesh.obj');
        const keys = [0, 0.125, 256].flatMap((x) =>
            ['px', 'm', 'x:L1:lamp'].flatMap((unitX) =>
                ['', 'lamp', 'O4096:0:0:0'].map((light) =>
                    ModelBuffer.getBatchKey(geometry, 'F0:', x, 0, 0, unitX, 'px', 'px', light))));
        expect(new Set(keys).size).toBe(27);
        expect(getPointStyleKey(undefined, undefined, undefined, false, undefined, 0, 0, 0, 'px', 'px', 'px')).toBe('P0');
    });

    it('retains full opacity, fill intensity and pointer-event distinctions', () => {
        const key = (opacity: number, intensity: number, pointer: boolean) =>
            BoxBuffer.getBatchKey(BoxBuffer.getGeometryKey(0),
                getBatchStateKey(0, 0, opacity, 0, false, false, false), undefined, 1, 'red', pointer, 'map',
                0, 0, 0, 'px', 'px', 'px', undefined, undefined, undefined, undefined, intensity);
        const keys = [0.5, 0.501, 0.509].flatMap((opacity) => [0.5, 1].flatMap((intensity) =>
            [true, false].map((pointer) => key(opacity, intensity, pointer))));
        expect(new Set(keys).size).toBe(12);
    });

    it('keeps numeric radii separate from lazy expression identities', () => {
        const radius = new ExpressionParser({}, {zoom: 14}).evaluate(['+', 2, ['zoom']], {}, ExpressionMode.dynamic);
        if (!(radius instanceof Expression)) throw new Error('Expected a dynamic radius');
        vi.spyOn(radius, 'id').mockReturnValue(4);
        expect(PointBuffer.getCircleGeometryKey(false, 'px', radius)).not.toBe(PointBuffer.getCircleGeometryKey(false, 'px', 4));
    });

    it('keeps absent lighting slots distinct from equal values in other slots', () => {
        const keys = [undefined, 'red', 'red:2'].flatMap((light) =>
            [undefined, 'red', 'red:2'].flatMap((emissive) =>
                [undefined, 'red', 'red:2'].map((specular) =>
                    getLightingKeyPart(light, getLightingColorIdentity(emissive), getLightingColorIdentity(specular), 8))));
        expect(new Set(keys).size).toBe(27);
        expect(getLightingKeyPart()).toBe('');
        expect(getLightingKeyPart(undefined, undefined, getLightingColorIdentity('red'), 8)).not.toBe(
            getLightingKeyPart(undefined, undefined, getLightingColorIdentity('red'), 8.01));
    });

    it('keeps free strings and expression IDs from consuming paint components', () => {
        expect(getPointStyleKey('red', 'e:7:blue', 'blue', false, 'map', 0, 0, 0, 'px', 'px', 'px')).not.toBe(
            getPointStyleKey('red', 'e', '7:blue:blue', false, 'map', 0, 0, 0, 'px', 'px', 'px'));
        expect(TextBuffer.getGeometryKey('fontP0:0::1:3:red')).not.toBe(TextBuffer.getGeometryKey('font'));
    });

    it('keeps optional paint fields, numeric/string widths and embedded font boundaries distinct', () => {
        const keys = ['', 'C', ':P1:', '2'].flatMap((font) =>
            [undefined, 'red', 'r:2'].flatMap((stroke) =>
                [undefined, 0, 1, '1', '', 'x:1'].flatMap((width) =>
                    [undefined, 'blue', 'b:3'].flatMap((fill) =>
                        [false, true].flatMap((pointer) =>
                            [undefined, 'map', 'viewport', 'x:y'].map((alignment) =>
                                TextBuffer.getBatchKey(stroke, width, fill, pointer, alignment,
                                    0, 0, 0, 'px', 'px', 'px', 'F0:', TextBuffer.getGeometryKey(font))))))));
        expect(new Set(keys).size).toBe(4 * 3 * 6 * 3 * 2 * 4);
    });

    it('keeps omitted defaults and custom units unambiguous across render fields', () => {
        const keys = [-1, 0, 1, 13, 10000].flatMap((rotation) =>
            [undefined, 1, 0.5, 0.5001].flatMap((opacity) =>
                [1, 0, 2].flatMap((intensity) =>
                    [undefined, -1, 0, 1, 13].flatMap((zLayer) =>
                        [[undefined, undefined, undefined], ['px', 'px', 'px'], ['m', 'px', 'px'], ['x:y', 'px', 'px']].flatMap((units) =>
                            ['', 'lamp', 'lamp:1:C'].map((light) =>
                                BoxBuffer.getBatchKey(BoxBuffer.getGeometryKey(rotation),
                                    getBatchStateKey(0, 0, opacity, zLayer, false, false, false),
                                    undefined, 1, 'red', true, 'map', 0, 0, 0, units[0], units[1], units[2],
                                    light, undefined, undefined, undefined, intensity)))))));
        expect(new Set(keys).size).toBe(5 * 4 * 3 * 5 * 4 * 3);
    });

    it('reuses common state only for identical primitive flags, opacity and zLayer', () => {
        const key = () => getBatchStateKey(0, 0, 0.5001, 3, true, false, false);
        const original = key();
        expect(getBatchStateKey(0, 0, 0.5001, 3, true, false, false)).toBe(original);
        const variants = [
            getBatchStateKey(1, 0, 0.5001, 3, true, false, false),
            getBatchStateKey(0, 1, 0.5001, 3, true, false, false),
            getBatchStateKey(0, 0, 0.5, 3, true, false, false),
            getBatchStateKey(0, 0, 0.5001, 4, true, false, false),
            getBatchStateKey(0, 0, 0.5001, 3, true, true, false),
            getBatchStateKey(0, 0, 0.5001, 3, true, false, true)
        ];
        expect(variants).not.toContain(original);
        expect(new Set(variants).size).toBe(variants.length);
        expect(key()).toBe(original);
    });

    it('keeps dash-image boundaries, stroke identities and width namespaces in Line-owned keys', () => {
        const geometry = LineBuffer.getGeometryKey(false, 'px', 0, 'px', 'round', 'round',
            {pattern: [4, 2], units: ['px', 'px']});
        const keys = [undefined, 'x:S2:3:red', 'u;', 'red'].flatMap((image) =>
            [undefined, 'red', 'x:2'].flatMap((stroke) =>
                [undefined, 0, 1, '1', 'x:S'].map((width) =>
                    LineBuffer.getBatchKey(geometry, 'F0:', stroke, width, true, image))));
        expect(new Set(keys).size).toBe(4 * 3 * 5);
        expect(LineBuffer.getBatchKey(geometry, 'F0:', 'red', 1, true, '')).toBe(
            LineBuffer.getBatchKey(geometry, 'F0:', 'red', 1, true, undefined));
    });
});

describe('Complete type-owned batch keys', () => {
    const state = getBatchStateKey(0, 0, 1, 0, false, false, false);
    const point = getPointStyleKey('red', 2, 'blue', true, 'map', 0, 0, 0, 'px', 'px', 'px');
    const offset = getOffsetStyleKey(0, 0, 0, 'px', 'px', 'px');
    const emissive = getLightingColorIdentity('red');
    const specular = getLightingColorIdentity('blue');
    const lighting = getLightingKeyPart('lamp', emissive, specular, 8, 0.8);
    const modelStyle: ModelStyle = {type: 'Model', zIndex: 0, model: 'mesh.obj', modelId: 7};
    const model = ModelBuffer.getGeometryKey(modelStyle, 'mesh.obj');
    const terrain = TerrainModelBuffer.getGeometryKey(modelStyle, 'mesh.obj');
    const line = LineBuffer.getGeometryKey(false, 'px', 0, 'px', 'round', 'round');

    it('uses direct aliases instead of extra forwarding calls for shared Point and Icon keys', () => {
        expect(PointBuffer.getPointBatchKey).toBe(getPointStyleKey);
        expect(TextBuffer.getBatchKey).toBe(PointBuffer.getPointBatchKey);
        expect(SymbolBuffer.getBatchKey).toBe(getOffsetStyleKey);
    });

    it.each([
        {type: 'Circle', key: () => PointBuffer.getPointBatchKey(
            'red', 2, 'blue', true, 'map', 0, 0, 0, 'px', 'px', 'px', state, PointBuffer.getCircleGeometryKey(false, 'px', 4)), expected: state + point + 'Cp:4'},
        {type: 'Rect', key: () => PointBuffer.getPointBatchKey(
            'red', 2, 'blue', true, 'map', 0, 0, 0, 'px', 'px', 'px', state, PointBuffer.getRectangleGeometryKey(false, 0, 'px', 4, 8)), expected: state + point + 'R0:p:4:8'},
        {type: 'Text', key: () => TextBuffer.getBatchKey(
            'red', 2, 'blue', true, 'map', 0, 0, 0, 'px', 'px', 'px', state, TextBuffer.getGeometryKey('12px monospace')), expected: state + point + 'T14:12px monospace'},
        {type: 'Box', key: () => BoxBuffer.getBatchKey(BoxBuffer.getGeometryKey(0), state,
            'red', 2, 'blue', true, 'map', 0, 0, 0, 'px', 'px', 'px', 'lamp', emissive, specular, 8, 0.8), expected: state + lighting + point + 'B0'},
        {type: 'Sphere', key: () => SphereBuffer.getBatchKey(SphereBuffer.getGeometryKey(4), state,
            'red', 2, 'blue', true, 'map', 0, 0, 0, 'px', 'px', 'px', 'lamp', emissive, specular, 8, 0.8), expected: state + lighting + point + 'S4:p'},
        {type: 'Icon', key: () => SymbolBuffer.getBatchKey(
            0, 0, 0, 'px', 'px', 'px', state, SymbolBuffer.getGeometryKey(false, 'map')), expected: state + offset + 'I3:map'},
        {type: 'Heatmap', key: () => HeatmapBuffer.getBatchKey(HeatmapBuffer.getGeometryKey(16, 'blue', 0.8), state,
            'red', 2, true, 'map', 0, 0, 0, 'px', 'px', 'px'), expected: state +
            getPointStyleKey('red', 2, undefined, true, 'map', 0, 0, 0, 'px', 'px', 'px') + 'H16:"blue":0.8'},
        {type: 'Line', key: () => LineBuffer.getBatchKey(line, state, 'red', 2), expected: state + getStrokeStyleKey('red', 2) + line},
        {type: 'Polygon', key: () => PolygonBuffer.getBatchKey(PolygonBuffer.getGeometryKey(), state,
            'red', 2, 'blue', 'lamp', emissive, specular, 8, 0.8), expected: state + lighting + getFillStrokeStyleKey('red', 2, 'blue') + 'P'},
        {type: 'Extrude', key: () => ExtrudeBuffer.getBatchKey(ExtrudeBuffer.getGeometryKey(), state,
            'red', 2, 'blue', 'lamp', emissive, specular, 8, 0.8), expected: state + lighting + getFillStrokeStyleKey('red', 2, 'blue') + 'E'},
        {type: 'VerticalLine', key: () => VerticalLineBuffer.getBatchKey(VerticalLineBuffer.getGeometryKey('-2m'), state,
            'red', 2), expected: state + getStrokeStyleKey('red', 2) + 'VL3:-2m'},
        {type: 'Model', key: () => ModelBuffer.getBatchKey(model, state,
            0, 0, 0, 'px', 'px', 'px', 'lamp', emissive, specular, 8, 0.8), expected: state + lighting + offset + model},
        {type: 'Terrain', key: () => TerrainModelBuffer.getBatchKey(terrain, state,
            0, 0, 0, 'px', 'px', 'px', 'lamp', emissive, specular, 8, 0.8), expected: state + lighting + offset + terrain}
    ])('composes only the relevant components for $type', ({key, expected}) => {
        expect(key()).toBe(expected);
    });
});

describe('Specialized program and buffer type contracts', () => {
    it('exposes concrete buffer, attribute and uniform types without wrappers', () => {
        expectTypeOf<Parameters<CircleProgram['draw']>[0]>().toEqualTypeOf<PointBuffer>();
        expectTypeOf<PointBuffer['attributes']['a_position']>().toEqualTypeOf<Attribute>();
        expectTypeOf<TextBuffer['uniforms']['u_texture']>().toMatchTypeOf<NonNullable<TextBuffer['uniforms']['u_texture']>>();
        expectTypeOf<LineBuffer['uniforms']['u_strokeWidth']>().toEqualTypeOf<(number | Expression)[]>();
        expectTypeOf<Parameters<typeof getLightingKeyPart>[1]>().toEqualTypeOf<LightingColorIdentity | undefined>();
        expectTypeOf<string>().not.toMatchTypeOf<LightingColorIdentity>();
    });
});
