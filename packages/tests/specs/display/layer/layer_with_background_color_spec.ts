/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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

describe('layer with background color', function() {
    const expect = chai.expect;

    let display;
    let mapContainer;
    let preparedData;

    let globalBackgroundcolor = '#ff0000';

    before(async () => {
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

    after(async () => {
        display.destroy();
    });

    it('validate default background color', async () => {
        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).to.equal('#ffffff');
    });

    it('change display background color', async () => {
        display.setBackgroundColor(globalBackgroundcolor);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).to.equal(globalBackgroundcolor);
    });

    it('add a layer without background color', async () => {
        preparedData = await prepare(dataset);

        expect(display.getLayers()).to.be.lengthOf(0);

        let newLayer = preparedData.getLayers('Layer1');

        await waitForViewportReady(display, [newLayer], () => {
            display.addLayer(newLayer);
        });

        expect(display.getLayers()).to.be.lengthOf(1);

        // validate default background color is white
        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).to.equal(globalBackgroundcolor);

        display.removeLayer(newLayer);
    });

    it('add a layer with background color', async () => {
        dataset.layers[1].style = {
            backgroundColor: '#0000ff'
        };

        preparedData = await prepare(dataset);

        expect(display.getLayers()).to.be.lengthOf(0);

        let newLayer = preparedData.getLayers('Layer2');

        await waitForViewportReady(display, [newLayer], () => {
            display.addLayer(newLayer);
        });

        expect(display.getLayers()).to.be.lengthOf(1);

        // validate default background color is white
        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).to.equal('#0000ff');
    });

    it('change layers background color', async () => {
        let layer = display.getLayers(0);
        let style = layer.getStyle();

        style.backgroundColor = '#00ff00';

        await waitForViewportReady(display, () => {
            layer.setStyle(style);
            display.refresh();
        });

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).to.equal('#00ff00');
    });

    it('remove Layer and validate global background color is set', async () => {
        display.removeLayer(display.getLayers(0));

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).to.equal(globalBackgroundcolor);
    });
});
