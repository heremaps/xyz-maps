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
import dataset from './setstylegroup_point_rect.json';

describe('setStyleGroup Point with rect', function() {
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
            center: {longitude: 73.075272, latitude: 19.931463},
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
                {'zIndex': 0, 'type': 'Rect', 'width': 30, 'height': 30, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of inner rect
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 391, 300); // get color at left border
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 409, 300); // get color at right border
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 291); // get color at top border
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 309); // get color of bottom border

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#000000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });

    it('style feature with opacity, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 30, 'height': 30, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 0.5, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of inner rect
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 391, 300); // get color at left border
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 409, 300); // get color at right border
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 291); // get color at top border
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 309); // get color of bottom border

                expect(color1).to.equal('#800000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#000000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });

    it('style feature with rotation, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 30, 'height': 30, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'rotation': 45, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of inner rect
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 391, 300); // get color at left border
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 409, 300); // get color at right border
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 291); // get color at top border
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 309); // get color of bottom border

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#ff0000');
                expect(color3).to.equal('#ff0000');
                expect(color4).to.equal('#ff0000');
                expect(color5).to.equal('#ff0000');

                resolve();
            }, 100);
        });
    });

    it('style feature with offsetX, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 30, 'height': 30, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'offsetX': 5, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of inner rect
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 391, 300); // get color at left border
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 409, 300); // get color at right border
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 291); // get color at top border
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 309); // get color of bottom border

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#ff0000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });

    it('style feature with offsetX again, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 30, 'height': 30, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'offsetX': -5, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of inner rect
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 391, 300); // get color at left border
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 409, 300); // get color at right border
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 291); // get color at top border
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 309); // get color of bottom border

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#ff0000');
                expect(color3).to.equal('#000000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });

    it('style feature with offsetY, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 30, 'height': 30, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'offsetY': 5, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of inner rect
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 391, 300); // get color at left border
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 409, 300); // get color at right border
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 291); // get color at top border
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 309); // get color of bottom border

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#000000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#ff0000');

                resolve();
            }, 100);
        });
    });

    it('style feature with offsetY again, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 30, 'height': 30, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'offsetY': -5, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of inner rect
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 391, 300); // get color at left border
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 409, 300); // get color at right border
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 291); // get color at top border
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 309); // get color of bottom border

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#000000');
                expect(color4).to.equal('#ff0000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });
});
