/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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

import {displayTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import dataset from './layer_with_background_color_spec.json';

describe('layer with background color', function() {
    const expect = chai.expect;

    let display;
    let mapContainer;
    let preparedData;

    before(async function() {
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 70, latitude: 21},
            zoomLevel: 18
        });

        mapContainer = display.getContainer();
    });

    after(async function() {
        display.destroy();
    });

    it('add a layer without background color', async function() {
        preparedData = await prepare(dataset);

        expect(display.getLayers()).to.be.lengthOf(0);

        let newLayer = preparedData.getLayers('spaceLayer1');

        await displayTests.waitForViewportReady(display, [newLayer], ()=>{
            display.addLayer(newLayer);
        });

        expect(display.getLayers()).to.be.lengthOf(1);

        // validate default background color is white
        await new Promise((resolve) => {
            setTimeout(() => {
                let color = testUtils.getCanvasPixelColor(mapContainer, 400, 300);
                expect(color).to.equal('#ffffff');
                resolve();
            }, 100);
        });

        display.removeLayer(newLayer);
    });

    it('add a layer with background color', async function() {
        dataset.layers[1].style = {
            backgroundColor: '#345678'
        };

        preparedData = await prepare(dataset);

        expect(display.getLayers()).to.be.lengthOf(0);

        let newLayer = preparedData.getLayers('spaceLayer2');

        await displayTests.waitForViewportReady(display, [newLayer], ()=>{
            display.addLayer(newLayer);
        });

        expect(display.getLayers()).to.be.lengthOf(1);

        // validate default background color is white
        await new Promise((resolve) => {
            setTimeout(() => {
                let color = testUtils.getCanvasPixelColor(mapContainer, 400, 300);
                expect(color).to.equal('#345678');
                resolve();
            }, 100);
        });

        display.removeLayer(newLayer);
    });
});
