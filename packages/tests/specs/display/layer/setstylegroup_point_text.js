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
import dataset from './setstylegroup_point_text.json';

describe('setStyleGroup Point with text', function() {
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
            center: {longitude: 73.124442, latitude: 20.181623},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        await displayTests.waitForViewportReady(display);

        mapContainer = display.getContainer();
        paLayer = preparedData.getLayers('paLayer');

        // add a feature
        feature = preparedData.getFeature('paLayer', '123');
    });

    after(async function() {
        display.destroy();
    });

    it('style feature with text, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': 'H', 'font': 'bold 96px Arial'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 275); // get color between bars of character H
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 400, 292); // get color of H in middle
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 400, 315); // get color between bars of character H
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 380, 300); // get color of left bar of H
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 420, 300); // get color of right bar of H

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#ff0000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });

    it('style feature with text and opacity, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': 'H', 'opacity': 0.5, 'font': 'bold 96px Arial'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 275); // get color between bars of character H
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 400, 292); // get color of H in middle
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 400, 315); // get color between bars of character H
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 380, 300); // get color of left bar of H
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 420, 300); // get color of right bar of H

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#800000');
                expect(color3).to.equal('#ff0000');
                expect(color4).to.equal('#800000');
                expect(color5).to.equal('#800000');

                resolve();
            }, 100);
        });
    });

    it('style feature with textRef, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'textRef': 'properties.address', 'font': 'bold 96px Arial'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 280); // get color inside O(upper)
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 400, 297); // get color inside O(middle)
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 400, 307); // get color inside O(lower)
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 425, 300); // get color on O

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#ff0000');
                expect(color3).to.equal('#ff0000');
                expect(color4).to.equal('#000000');

                resolve();
            }, 100);
        });
    });

    it('style feature with text and offsetX, validate its style', async function() {
        // set style for the added feature, offsetX is set to 5
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': 'H', 'font': 'bold 96px Arial', 'offsetX': 10}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 410, 275); // get color between bars of character H
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 410, 292); // get color of H in middle
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 410, 315); // get color between bars of character H
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 390, 300); // get color of left bar of H
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 430, 300); // get color of right bar of H

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#ff0000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });

    it('style feature with text and offsetX again, validate its style', async function() {
        // set style for the added feature, offsetX is set to -5
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': 'H', 'font': 'bold 96px Arial', 'offsetX': -10}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 390, 275); // get color between bars of character H
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 390, 292); // get color of H in middle
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 390, 315); // get color between bars of character H
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 370, 300); // get color of left bar of H
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 410, 300); // get color of right bar of H

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#ff0000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });

    it('style feature with text and offsetY, validate its style', async function() {
        // set style for the added feature, offsetY is set to 5
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': 'H', 'font': 'bold 96px Arial', 'offsetY': 10}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 285); // get color between bars of character H
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 400, 302); // get color of H in middle
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 400, 325); // get color between bars of character H
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 380, 310); // get color of left bar of H
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 420, 310); // get color of right bar of H

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#ff0000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });

    it('style feature with text and offsetY again, validate its style', async function() {
        // set style for the added feature, offsetY is set to -5
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': 'H', 'font': 'bold 96px Arial', 'offsetY': -10}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 265); // get color between bars of character H
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 400, 282); // get color of H in middle
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 400, 305); // get color between bars of character H
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 380, 290); // get color of left bar of H
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 420, 290); // get color of right bar of H

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#ff0000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });

    it('style feature with text and offsetX, offsetY, validate its style', async function() {
        // set style for the added feature, both offsetX and offsetY are set to 5
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': 'H', 'font': 'bold 96px Arial', 'offsetX': 10, 'offsetY': 10}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 410, 285); // get color between bars of character H
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 410, 302); // get color of H in middle
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 410, 325); // get color between bars of character H
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 390, 310); // get color of left bar of H
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 430, 310); // get color of right bar of H

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#000000');
                expect(color3).to.equal('#ff0000');
                expect(color4).to.equal('#000000');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });
});
