/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
import {getCanvasPixelColor, prepare} from 'utils';
import {Map} from '@here/xyz-maps-display';
import dataset from './layer_with_background_color_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('layer with background color', function() {
    let display;
    let mapContainer;
    let preparedData;

    let globalBackgroundcolor = '#ff0000';

    beforeAll(async () => {
        display = new Map(document.getElementById('map'), {
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 70, latitude: 21},
            zoomlevel: 18
        });

        mapContainer = display.getContainer();

        await waitForViewportReady(display);
    });

    afterAll(async () => {
        display.destroy();
    });

    it('validate default background color', async () => {
        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: '#ffffff'
        });
        expect(color).toBe('#ffffff');
    });

    it('change display background color StyleValueFunction', async () => {
        display.setBackgroundColor((zoom)=>'blue');

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: '#0000ff'
        });
        expect(color).toBe('#0000ff');
    });

    it('change display background color ZoomRangeMap', async () => {
        display.setBackgroundColor({1: 'blue', 20: 'red'});

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: '#e4001b'
        });
        expect(color).toBe('#e4001b');
    });

    it('change display background color', async () => {
        display.setBackgroundColor(globalBackgroundcolor);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: globalBackgroundcolor
        });
        expect(color).toBe(globalBackgroundcolor);
    });

    it('add a layer without background color', async () => {
        preparedData = await prepare(dataset);

        expect(display.getLayers()).toHaveLength(0);

        let newLayer = preparedData.getLayers('Layer1');

        await waitForViewportReady(display, [newLayer], () => {
            display.addLayer(newLayer);
        });

        expect(display.getLayers()).toHaveLength(1);

        // validate default background color is white
        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: globalBackgroundcolor
        });
        expect(color).toBe(globalBackgroundcolor);

        display.setBackgroundColor('blue');
        color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {expect: '#0000ff'});
        expect(color).toBe('#0000ff');

        display.setBackgroundColor(globalBackgroundcolor);
        color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {expect: globalBackgroundcolor});
        expect(color).toBe(globalBackgroundcolor);

        display.removeLayer(newLayer);
    });

    it('add a layer with background color', async () => {
        // @ts-ignore
        dataset.layers[1].style = {
            backgroundColor: '#0000ff'
        };

        preparedData = await prepare(dataset);

        expect(display.getLayers()).toHaveLength(0);

        let newLayer = preparedData.getLayers('Layer2');

        await waitForViewportReady(display, [newLayer], () => {
            display.addLayer(newLayer);
        });

        expect(display.getLayers()).toHaveLength(1);

        // validate default background color is white
        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: '#0000ff'
        });
        expect(color).toBe('#0000ff');
    });

    it('keep explicit layer background when changing global background', async () => {
        display.setBackgroundColor('yellow');

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: '#0000ff'
        });
        expect(color).toBe('#0000ff');

        display.setBackgroundColor(globalBackgroundcolor);
    });

    it('change layers background color', async () => {
        let layer = display.getLayers(0);
        let style = layer.getStyle();

        style.backgroundColor = '#00ff00';

        await waitForViewportReady(display, () => {
            layer.setStyle(style);
            display.refresh();
        });

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: '#00ff00'
        });
        expect(color).toBe('#00ff00');
    });

    it('use current global background after removing layer background', async () => {
        let layer = display.getLayers(0);
        let style = layer.getStyle();
        delete style.backgroundColor;

        await waitForViewportReady(display, () => {
            layer.setStyle(style);
            display.refresh();
        });

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: globalBackgroundcolor
        });
        expect(color).toBe(globalBackgroundcolor);

        display.setBackgroundColor('blue');
        color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {expect: '#0000ff'});
        expect(color).toBe('#0000ff');

        display.setBackgroundColor(globalBackgroundcolor);
    });

    it('remove Layer and validate global background color is set', async () => {
        display.removeLayer(display.getLayers(0));

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: globalBackgroundcolor
        });
        expect(color).toBe(globalBackgroundcolor);
    });
});
