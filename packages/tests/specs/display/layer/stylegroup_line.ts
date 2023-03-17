/*
 * Copyright (C) 2019-2023 HERE Europe B.V.
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

import {waitForViewportReady} from 'displayUtils';
import {getCanvasPixelColor} from 'utils';
import {TileLayer, LocalProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

describe('StyleGroup Line geometry', () => {
    const expect = chai.expect;
    let segment05to1 = {x: 238, y: 278};
    let segment0to05 = {x: 569, y: 328};
    let display;
    let mapContainer;
    let line1;
    let layer;

    before(async () => {
        layer = new TileLayer({
            min: 2,
            max: 20,
            provider: new LocalProvider()
        });


        display = new Map(document.getElementById('map'), {
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {
                longitude: 11.58487, latitude: 48.21255
            },
            zoomlevel: 20,
            layers: [layer]
        });

        line1 = layer.addFeature({
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: [
                    [11.58531, 48.21251],
                    [11.58487, 48.21255],
                    [11.58443, 48.21259]
                ]
            }
        });
        await waitForViewportReady(display);

        mapContainer = display.getContainer();
    });

    after(async () => display.destroy());

    it('validate default line style', async () => {
        const colors = await getCanvasPixelColor(mapContainer, [segment05to1, segment0to05]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#ff0000');
    });

    it('style line range from 0 to 0.5', async () => {
        layer.setStyleGroup(line1, [{
            type: 'Line',
            stroke: '#0000ff',
            strokeWidth: 16,
            zIndex: 4,
            from: 0,
            to: 0.5
        }]);


        const colors = await getCanvasPixelColor(mapContainer, [segment0to05, segment05to1]);
        expect(colors[0]).to.equal('#0000ff');
        expect(colors[1]).to.equal('#ffffff');
    });

    it('style line range from 0.5 to 1', async () => {
        layer.setStyleGroup(line1, [{
            type: 'Line',
            stroke: '#00ff00',
            strokeWidth: 16,
            zIndex: 4,
            from: 0.5,
            to: 1.0
        }]);


        const colors = await getCanvasPixelColor(mapContainer, [segment0to05, segment05to1]);
        expect(colors[0]).to.equal('#ffffff');
        expect(colors[1]).to.equal('#00ff00');
    });
});
