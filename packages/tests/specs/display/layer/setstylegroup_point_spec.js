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
import dataset from './setstylegroup_point_spec.json';

describe('setStyleGroup Point', function() {
    const expect = chai.expect;

    let paLayer;
    let display;
    let mapContainer;
    let feature1;
    let feature2;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.138138, latitude: 20.187398},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });

        await displayTests.waitForViewportReady(display);

        mapContainer = display.getContainer();
        paLayer = preparedData.getLayers('paLayer');

        // get features
        feature1 = preparedData.getFeature('paLayer', '123');
        feature2 = preparedData.getFeature('paLayer', '124');
    });

    after(async function() {
        display.destroy();
    });

    it('style feature, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature1,
            {'zIndex': 0, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 16}
        );

        paLayer.setStyleGroup(
            feature2,
            {'zIndex': 0, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 16}
        );

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of address 1
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 217, 300); // get color of address 2

                expect(color1).to.equal('#be6b65');
                expect(color2).to.equal('#be6b65');

                resolve();
            }, 100);
        });

        // reset style
        paLayer.setStyleGroup(
            feature1
        );

        paLayer.setStyleGroup(
            feature2
        );

        // validate features have style reset
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color of address 1 again
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 217, 300); // get color of address 2 again

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#ff0000');

                resolve();
            }, 100);
        });
    });

    it('style feature with different zIndex, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature1, [
                {'zIndex': 0, 'type': 'Rect', 'width': 8, 'height': 16, 'opacity': 1, 'fill': '#be6b65'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 8, 'opacity': 1, 'fill': '#ffffff'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color in middle of address 1
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 400, 305); // get color in mid bottom of address 1
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 405, 300); // get color in mid right of address 1

                expect(color1).to.equal('#ffffff');
                expect(color2).to.equal('#be6b65');
                expect(color3).to.equal('#ffffff');

                resolve();
            }, 100);
        });


        // set style for the added feature
        paLayer.setStyleGroup(
            feature1, [
                {'zIndex': 1, 'type': 'Rect', 'width': 8, 'height': 16, 'opacity': 1, 'fill': '#be6b65'},
                {'zIndex': 0, 'type': 'Rect', 'width': 16, 'height': 8, 'opacity': 1, 'fill': '#ffffff'}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color in the middle of address 1
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 400, 305); // get color in mid bottom of address 1
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 405, 300); // get color in mid right of address 1

                expect(color1).to.equal('#be6b65');
                expect(color2).to.equal('#be6b65');
                expect(color3).to.equal('#ffffff');

                resolve();
            }, 100);
        });
    });
});
