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
import dataset from './setstylegroup_point_circle.json';

describe('setStyleGroup Point with circle', function() {
    const expect = chai.expect;

    let paLayer;
    let display;
    let mapContainer;
    let feature;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.549401, latitude: 19.815739},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        await displayTests.waitForViewportReady(display);

        mapContainer = display.getContainer();
        paLayer = preparedData.getLayers('paLayer');

        // get a feature
        feature = preparedData.getFeature('paLayer', '123');
    });

    after(async function() {
        display.destroy();
    });

    it('style feature and validate', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Circle', 'radius': 14, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Circle', 'radius': 10, 'opacity': 1, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of inner circle
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 388, 300); // get color at left border
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 412, 300); // get color at right border
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 288); // get color at top border
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 312); // get color of bottom border

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#000000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });

    it('style feature with offsetX and validate', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Circle', 'radius': 14, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Circle', 'radius': 10, 'opacity': 1, 'offsetX': 4, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of inner circle
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 388, 300); // get color at left border
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 412, 300); // get color at right border
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 288); // get color at top border
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 312); // get color of bottom border

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#ff0000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });

    it('style feature with offsetX again and validate', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Circle', 'radius': 14, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Circle', 'radius': 10, 'opacity': 1, 'offsetX': -4, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of inner circle
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 388, 300); // get color at left border
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 412, 300); // get color at right border
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 288); // get color at top border
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 312); // get color of bottom border

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#ff0000');
                expect(color3).to.equal('#000000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });

    it('style feature with offsetY and validate', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Circle', 'radius': 14, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Circle', 'radius': 10, 'opacity': 1, 'offsetY': 4, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of inner circle
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 388, 300); // get color at left border
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 412, 300); // get color at right border
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 288); // get color at top border
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 312); // get color of bottom border

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#000000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#ff0000');

                resolve();
            }, 100);
        });
    });

    it('style feature with offsetY again and validate', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Circle', 'radius': 14, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Circle', 'radius': 10, 'opacity': 1, 'offsetY': -4, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of inner circle
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 388, 300); // get color at left border
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 412, 300); // get color at right border
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 288); // get color at top border
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 312); // get color of bottom border

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#000000');
                expect(color4).to.equal('#ff0000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });

    it('style feature with fill and stroke color', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Circle', 'radius': 14, 'opacity': 1, 'fill': '#000000', 'stroke': '#ffff00', 'strokeWidth': 7},
                {'zIndex': 1, 'type': 'Circle', 'radius': 10, 'opacity': 1, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of inner circle
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 388, 300); // get color at left border
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 412, 300); // get color at right border
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 288); // get color at top border
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 312); // get color of bottom border

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#ffff00');
                expect(color3).to.equal('#ffff00');
                expect(color4).to.equal('#ffff00');
                expect(color5).to.equal('#ffff00');

                resolve();
            }, 100);
        });
    });
});
