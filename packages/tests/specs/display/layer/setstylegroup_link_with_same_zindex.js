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
import dataset from './setstylegroup_link_with_same_zindex.json';

describe('setStyleGroup link with same zIndex', function() {
    const expect = chai.expect;

    let linkLayer;
    let buildingLayer;
    let display;
    let mapContainer;
    let feature;
    let building;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.684292, latitude: 21.190383},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });

        await displayTests.waitForViewportReady(display);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');
        buildingLayer = preparedData.getLayers('buildingLayer');

        feature = preparedData.getFeature('linkLayer', '123');
        building = preparedData.getFeature('buildingLayer', '123');
    });

    after(async function() {
        display.destroy();
    });

    it('style feature with different zIndex, validate its style', async function() {
        // set style for the added feature with different zIndex, same color
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 18},
                {'zIndex': 1, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 8}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 450, 300); // get color of link inline
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 450, 304); // get color of link outline

                expect(color1).to.equal('#be6b65');
                expect(color2).to.equal('#be6b65');

                resolve();
            }, 100);
        });
    });

    it('style feature with different stroke color, validate its style', async function() {
        // set style for the added feature with same zIndex, different color
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 18},
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#ffffff', 'strokeWidth': 8}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 450, 300); // get color of link inline
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 450, 306); // get color of link outline

                expect(color2).to.equal('#be6b65');

                resolve();
            }, 100);
        });

        // set style for the added feature with same zIndex, different color
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#ffffff', 'strokeWidth': 8},
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 18}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 450, 300); // get color of link inline
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 450, 306); // get color of link outline

                expect(color2).to.equal('#be6b65');

                resolve();
            }, 100);
        });
    });

    it('style feature with different stroke width, validate its style', async function() {
        // set style for the added feature with same zIndex, different strokewidth
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 18},
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 8}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 450, 300); // get color of link inline
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 450, 306); // get color of link outline

                expect(color1).to.equal('#be6b65');
                expect(color2).to.equal('#be6b65');

                resolve();
            }, 100);
        });

        // set style for the added feature with same zIndex, different strokewidth
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 8},
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 18}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 450, 300); // get color of link inline
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 450, 306); // get color of link outline

                expect(color1).to.equal('#be6b65');
                expect(color2).to.equal('#be6b65');

                resolve();
            }, 100);
        });
    });

    it('style feature with same zIndex and style, opacity set to 0.5, validate its style', async function() {
        // style build as background color
        buildingLayer.setStyleGroup(
            building,
            {'zIndex': 0, 'type': 'Polygon', 'fill': '#000000', 'stroke': '#000000'}
        );

        // set style for the added feature with same zIndex and color
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 0.5, 'stroke': '#ffffff', 'strokeWidth': 18},
                {'zIndex': 0, 'type': 'Line', 'opacity': 0.5, 'stroke': '#ffffff', 'strokeWidth': 18}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color = testUtils.getCanvasPixelColor(mapContainer, 450, 300); // get color of link in the middle

                expect(color).to.equal('#bfbfbf');

                resolve();
            }, 100);
        });
    });

    it('style feature with different zIndex and style, validate its style', async function() {
        // set style for the added feature with same zIndex and color
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 0.5, 'stroke': '#ffffff', 'strokeWidth': 18},
                {'zIndex': 1, 'type': 'Line', 'opacity': 0.5, 'stroke': '#ffffff', 'strokeWidth': 18}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color = testUtils.getCanvasPixelColor(mapContainer, 450, 300); // get color of link in the middle

                expect(color).to.equal('#bfbfbf');

                resolve();
            }, 100);
        });
    });

    it('style feature with same zIndex 1 and style, validate its style', async function() {
        // set style for the added feature with same zIndex and color
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 1, 'type': 'Line', 'opacity': 0.5, 'stroke': '#ffffff', 'strokeWidth': 18},
                {'zIndex': 1, 'type': 'Line', 'opacity': 0.5, 'stroke': '#ffffff', 'strokeWidth': 18}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color = testUtils.getCanvasPixelColor(mapContainer, 450, 300); // get color of link in the middle

                expect(color).to.equal('#bfbfbf');

                resolve();
            }, 100);
        });
    });
});
