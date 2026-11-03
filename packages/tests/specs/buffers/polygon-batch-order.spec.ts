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
import {LocalProvider, TileLayer, PolygonStyle} from '@here/xyz-maps-core';
import {Map as MapView} from '../../../display/src/Map';
import WebglDisplay from '../../../display/src/displays/webgl/Display';
import {PolygonBuffer} from '../../../display/src/displays/webgl/buffer/types/PolygonBuffer';
import {waitForViewportReady} from '../../src/synchronization/viewport';

it.each([1, 0.5])('keeps outline-sensitive fill partitions at equal zIndex and opacity %s', async (opacity) => {
    const original = PolygonBuffer.getBatchKey;
    const render = async (merge: boolean) => {
        const spy = merge ? vi.spyOn(PolygonBuffer, 'getBatchKey').mockImplementation(
            (geometry, state, _stroke, _width, fill, ...light) => original(geometry, state, '', undefined, fill, ...light)
        ) : undefined;
        const container = document.createElement('div');
        container.style.cssText = 'width:256px;height:256px';
        document.body.appendChild(container);
        const provider = new LocalProvider();
        const styles: PolygonStyle[][] = ['#0000ff', '#00ff00'].map((stroke) => [{
            type: 'Polygon', zIndex: 0, fill: '#ff0000', stroke, strokeWidth: 10, opacity
        }]);
        const layer = new TileLayer({provider, style: {
            styleGroups: {a: styles[0], b: styles[1]}, assign: (feature) => feature.id === 'a' ? 'a' : 'b'
        }});
        let map: MapView;
        try {
            const options = {center: {longitude: 0.001, latitude: 0.001}, zoomlevel: 18, devicePixelRatio: 1,
                layers: [layer], renderOptions: {preserveDrawingBuffer: true}};
            map = new MapView(container, options);
            await waitForViewportReady(map, () => {
                for (const [id, start, end] of [['a', 30, 180], ['b', 80, 230]] as const) {
                    const points = [[start, start], [end, start], [end, end], [start, end], [start, start]]
                        .map(([x, y]) => {
                            const geo = map.pixelToGeo(x, y);
                            return [geo.longitude, geo.latitude];
                        });
                    layer.addFeature({type: 'Feature', id, properties: {}, geometry: {type: 'Polygon', coordinates: [points]}});
                }
            });
            const display = map['_display'];
            if (!(display instanceof WebglDisplay)) throw new Error('Polygon order regression requires WebGL');
            display['viewport']();
            const gl = display.render.device.gl;
            const pixels = new Uint8Array(256 * 256 * 4);
            gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            expect(map.getFeatureAt({x: 120, y: 120})?.feature.id).toBe('b');
            const buffers = display['_zSortedTileBuffers'].tileBuffers.filter((item) => item.tiled && item.buffer instanceof PolygonBuffer);
            expect(new Set(buffers.map((item) => item.buffer)).size).toBe(merge ? 1 : 2);
            return pixels;
        } finally {
            map?.destroy();
            provider.clear();
            container.remove();
            spy?.mockRestore();
        }
    };
    const reference = await render(false);
    const merged = await render(true);
    if (opacity === 1) expect(merged).toStrictEqual(reference);
    else expect(merged).not.toStrictEqual(reference);
    expect(await render(false)).toStrictEqual(reference);
});
