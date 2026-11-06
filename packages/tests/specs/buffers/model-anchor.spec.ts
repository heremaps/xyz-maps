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
import {describe, expect, it} from 'vitest';
import {Feature, LocalProvider, ModelStyle, TileLayer, webMercator} from '@here/xyz-maps-core';
import {Layer, Layers} from '../../../display/src/displays/Layers';
import {createZoomRangeFunction, fillDiscreteMap, fillMap, getPolygonAnchor, getValue, parseStyleGroup, Style} from '../../../display/src/displays/styleTools';

describe('Polygon model anchor resolution', () => {
    const ring = [[10, 10], [14, 10], [14, 60], [10, 60], [10, 10]];
    const layer = new TileLayer({provider: new LocalProvider()});
    const parser = new Layer(layer, new Layers()).getExpressionParser();
    const resolve = (style: Style, feature: Feature) => {
        parseStyleGroup([style], parser);
        parser.clearResultCache();
        return getPolygonAnchor(style, feature, 18);
    };

    for (const type of ['Polygon', 'MultiPolygon'] as const) {
        it(`resolves static, callback and expression coordinates without caching on ${type}`, () => {
            const feature = layer.addFeature({
                type: 'Feature',
                geometry: {type, coordinates: type === 'Polygon' ? [ring] : [[ring]]},
                properties: {anchorPoint: [11, 12]}
            });
            const base: ModelStyle = {type: 'Model', zIndex: 0, model: 'unused.obj'};
            const center = resolve({...base}, feature);
            expect(center).toEqual([12, webMercator.y2lat(
                (webMercator.lat2y(10, 1) + webMercator.lat2y(60, 1)) / 2, 1
            )]);
            expect(resolve({...base, anchor: [13, 14]}, feature)).toEqual([13, 14]);
            const callback: ModelStyle = {...base, anchor: (f) => f.properties.anchorPoint ?? 'Center'};
            const expression: ModelStyle = {...base, anchor: ['get', 'anchorPoint']};
            for (const style of [callback, expression]) {
                expect(resolve(style, feature)).toEqual([11, 12]);
                feature.properties.anchorPoint = [15, 16];
                expect(resolve(style, feature)).toEqual([15, 16]);
                feature.properties.anchorPoint = [11, 12];
            }
            expect(resolve({...base, anchor: 'Center'}, feature)).toEqual(center);
            expect(resolve({...base, anchor: 'Centroid'}, feature)).toEqual([12, 35]);
            const circle: Style = {type: 'Circle', zIndex: 0, anchor: [13, 14]};
            expect(resolve(circle, feature)).toEqual([13, 14]);
        });
    }

    it('falls back to the center when no coordinate pair is provided', () => {
        const feature = layer.addFeature({
            type: 'Feature', geometry: {type: 'Polygon', coordinates: [ring]}, properties: {}
        });
        const center = resolve({type: 'Model', zIndex: 0}, feature);
        for (const anchor of [undefined, [], [1]]) {
            expect(resolve({
                type: 'Model', zIndex: 0, anchor: () => anchor
            } as unknown as Style, feature)).toEqual(center);
        }
    });

    it('prepares rounded discrete model stops once for integer zooms 1–20, retaining coordinate references', () => {
        const coordinate: [number, number] = [1, 2];
        const values: ModelStyle['anchor'] = {
            '20': 'Centroid', '2': 'Center', '10.5': coordinate
        };
        const anchor: ModelStyle['anchor'] = Object.assign(Object.create(null), values);
        const style: Style = {type: 'Model', zIndex: 0, anchor};
        const feature = layer.addFeature({
            type: 'Feature', geometry: {type: 'Polygon', coordinates: [ring]}, properties: {}
        });
        parseStyleGroup([style], parser);
        const prepared = style.anchor;
        parseStyleGroup([style], parser);
        expect(style.anchor).toBe(prepared);
        for (const [zoom, expected] of [[1, 'Center'], [2, 'Center'], [10, 'Center'],
            [11, coordinate], [19, coordinate], [20, 'Centroid']] as const) {
            expect(getValue('anchor', style, undefined, zoom)).toBe(expected);
        }
        expect(getPolygonAnchor(style, feature, 11)).toBe(coordinate);
        expect(getPolygonAnchor(style, feature, 19)).toBe(coordinate);
        expect(getPolygonAnchor(style, feature, 20)).toEqual([12, 35]);
    });

    it('supports discrete string maps on existing point styles', () => {
        for (const type of ['Circle', 'Text', 'Rect', 'Image']) {
            const style: Style = {type, zIndex: 0, anchor: {2: 'Coordinate', 10: 'Line'}};
            parseStyleGroup([style], parser);
            expect(getValue('anchor', style, undefined, 9)).toBe('Coordinate');
            expect(getValue('anchor', style, undefined, 10)).toBe('Line');
        }
    });

    it('keeps empty discrete maps empty', () => {
        expect(fillDiscreteMap({})).toEqual({});
        const range = createZoomRangeFunction({}, false, true);
        expect(range.map).toEqual({});
        expect(range(undefined, 10)).toBeUndefined();
    });

    it('uses the last equivalent stop and retains the debug map', () => {
        const map = {'1': 'Center', '1.0': 'Centroid'};
        const range = createZoomRangeFunction(map, false, true);
        expect(range.map).not.toBe(map);
        expect(range(1)).toBe('Centroid');
        expect(range(undefined, 20)).toBe('Centroid');
        expect(range.map[20]).toBe('Centroid');
    });

    it('shares fillMap rounding and exact lookup conventions without interpolating', () => {
        const stops = {'2.4': 10, '10.5': 100, '18.6': 200};
        const discrete = fillDiscreteMap(stops);
        const interpolated = fillMap(stops, false);
        for (const zoom of [1, 2, 11, 19, 20]) {
            expect(discrete[zoom]).toBe(interpolated[zoom]);
        }
        expect(discrete[6]).toBe(10);
        expect(interpolated[6]).toBeGreaterThan(10);
        for (const mode of [false, true]) {
            const range = createZoomRangeFunction(stops, false, mode);
            expect(range(1)).toBe(10);
            expect(range({}, 20)).toBe(200);
            expect(range({}, 11)).toBe(100);
            expect(range(10.5)).toBeUndefined();
            expect(range(21)).toBeUndefined();
            expect(range(0)).toBeUndefined();
        }
    });

    it('parses anchor expressions only once per style', () => {
        const style: Style = {type: 'Model', zIndex: 0, anchor: ['literal', 'Centroid']};
        parseStyleGroup([style], parser);
        const anchor = style.anchor;
        parseStyleGroup([style], parser);
        expect(style.anchor).toBe(anchor);
        expect(getValue('anchor', style, {properties: {}} as Feature, 18)).toBe('Centroid');
    });

    it('resolves coordinate stops without copying their values', () => {
        const feature = layer.addFeature({
            type: 'Feature', geometry: {type: 'Polygon', coordinates: [ring]}, properties: {}
        });
        const center = resolve({type: 'Model', zIndex: 0}, feature);
        for (const anchor of [[13, 14], [-180, -90], [180, 90]] as [number, number][]) {
            const style: Style = {
                type: 'Model', zIndex: 0, anchor: {1: 'Center', 20: anchor}
            };
            parseStyleGroup([style], parser);
            expect(getPolygonAnchor(style, feature, 1)).toEqual(center);
            expect(getPolygonAnchor(style, feature, 20)).toBe(anchor);
        }
    });
});
