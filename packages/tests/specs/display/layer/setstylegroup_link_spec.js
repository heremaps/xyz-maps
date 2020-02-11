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
import dataset from './setstylegroup_link_spec.json';

describe('setStyleGroup Link', function() {
    const expect = chai.expect;

    let preparedData;
    let linkLayer;
    let display;
    let mapContainer;
    let feature;

    before(async function() {
        preparedData = await prepare(dataset);

        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.707821, latitude: 21.189023},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        await displayTests.waitForViewportReady(display);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');

        feature = preparedData.getFeature('linkLayer', '123');
    });

    after(async function() {
        display.destroy();
    });

    it('style feature, validate its new style', async function() {
        // validate link style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color = testUtils.getCanvasPixelColor(mapContainer, 448, 300); // get link color
                // default color is red
                expect(color).to.equal('#ff0000');
                resolve();
            }, 100);
        });

        // set link style
        linkLayer.setStyleGroup(
            feature,
            {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 16}
        );

        // validate new link style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color = testUtils.getCanvasPixelColor(mapContainer, 448, 300); // get link color
                expect(color).to.equal('#be6b65');
                resolve();
            }, 100);
        });

        // reset link style
        linkLayer.setStyleGroup(
            feature
        );

        // validate link style is reset
        await new Promise((resolve) => {
            setTimeout(() => {
                let color = testUtils.getCanvasPixelColor(mapContainer, 448, 300); // get link color
                expect(color).to.equal('#ff0000');
                resolve();
            }, 100);
        });
    });

    it('style feature, validate its new style', async function() {
        // set link style
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 5},
                {'zIndex': 1, 'type': 'Line', 'opacity': 1, 'stroke': '#ffffff', 'strokeWidth': 16}
            ]);

        // validate new link style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 448, 300); // get color at position of inline
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 448, 307); // get color at position of outline
                expect(color1).to.equal('#ffffff');
                expect(color2).to.equal('#ffffff');
                resolve();
            }, 100);
        });

        // set link style
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 1, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 5},
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#ffffff', 'strokeWidth': 16}
            ]);

        // validate new link style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 448, 300); // get color of link inline
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 448, 307); // get color of link outline
                expect(color1).to.equal('#be6b65');
                expect(color2).to.equal('#ffffff');
                resolve();
            }, 100);
        });
    });

    it('style feature with text, validate its new style', async function() {
        // set link style
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'stroke': '#000000', 'strokeWidth': 18},
                {'zIndex': 1, 'type': 'Text', 'fill': '#ffffff', 'text': 'HERE', 'font': 'bold 30px Arial'}
            ]);

        // validate new link style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 448, 303); // get color of link
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 454, 303); // get color of first character H (left side)
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 462, 303); // get color between bars of character H
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 467, 303); // get color of first character H (right side)
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 472, 303); // get link color between first H and E

                expect(color1).to.equal('#000000');
                expect(color2).to.equal('#ffffff');
                expect(color3).to.equal('#000000');
                expect(color4).to.equal('#ffffff');
                expect(color5).to.equal('#000000');

                resolve();
            }, 100);
        });
    });
});

