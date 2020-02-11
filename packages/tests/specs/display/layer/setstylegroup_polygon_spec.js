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

import {displayTests, prepare, testUtils} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import chaiAlmost from 'chai-almost';
import dataset from './setstylegroup_polygon_spec.json';

describe('setStyleGroup Polygon', function() {
    const expect = chai.expect;

    let buildingLayer;
    let display;
    let mapContainer;
    let feature;

    before(async function() {
        chai.use(chaiAlmost(1));
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.472006, latitude: 21.404435},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        await displayTests.waitForViewportReady(display);

        mapContainer = display.getContainer();
        buildingLayer = preparedData.getLayers('buildingLayer');

        // get feature
        feature = preparedData.getFeature('buildingLayer', '123');
    });

    after(async function() {
        display.destroy();
    });

    it('style feature, validate its new style', async function() {
        // set style for the added feature
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'opacity': 1, 'fill': '#9fe030', 'stroke': '#906fff', 'strokeWidth': 15}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 380, 280); // get fill color
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 247, 327); // get stroke color on first shape point

                expect(color1).to.equal('#9fe030');
                expect(color2).to.equal('#906fff');

                resolve();
            }, 100);
        });
    });

    it('style feature with opacity, validate its new style', async function() {
        // set style for the added feature
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'opacity': 0.6, 'fill': '#9fe030', 'stroke': '#916eff', 'strokeWidth': 15}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 380, 280); // get fill color
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 246, 328); // get stroke color on first shape point

                // expect(color1).to.equal('#c5ec82');
                color1 = color1.replace('#', '0x');
                // blue
                expect(parseInt(color1) >> 0 & 255).to.almost.equal(131);
                // green
                expect(parseInt(color1) >> 8 & 255).to.almost.equal(236);
                // red
                expect(parseInt(color1) >> 16 & 255).to.almost.equal(197);

                // expect(color2).to.equal('#a385ff');
                color2 = color2.replace('#', '0x');
                // blue
                expect(parseInt(color2) >> 0 & 255).to.almost.equal(255);
                // green
                expect(parseInt(color2) >> 8 & 255).to.almost.equal(133);
                // red
                expect(parseInt(color2) >> 16 & 255).to.almost.equal(163);

                resolve();
            }, 100);
        });
    });

    it('style feature with opacity, validate its new style', async function() {
        // set style for the added feature
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'opacity': 0.6, 'fill': '#9fe030', 'stroke': '#906fff', 'strokeWidth': 15},
                {'zIndex': 1, 'type': 'Polygon', 'opacity': 1, 'fill': '#ff0000', 'stroke': '#906fff', 'strokeWidth': 15}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 380, 280); // get fill color
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 247, 327); // get stroke color on first shape point

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#906fff');

                resolve();
            }, 100);
        });
    });
});
