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

import {waitForViewportReady} from 'displayUtils';
import {getCanvasPixelColor, prepare} from 'utils';
import {Map} from '@here/xyz-maps-core';
import dataset from './setstylegroup_polygon_spec.json';

describe('setStyleGroup Polygon', function() {
    const expect = chai.expect;

    let buildingLayer;
    let display;
    let mapContainer;
    let feature;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.472006, latitude: 21.404435},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        await waitForViewportReady(display);

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
                let color1 = getCanvasPixelColor(mapContainer, 380, 280); // get fill color
                let color2 = getCanvasPixelColor(mapContainer, 247, 327); // get stroke color on first shape point

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
                // fill and opacity values makes sure alpha blending background and fill colors/background and stroke colors will produce integer color value
                {'zIndex': 0, 'type': 'Polygon', 'opacity': 0.6, 'fill': '#9be128', 'stroke': '#3750cd', 'strokeWidth': 15}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = getCanvasPixelColor(mapContainer, 380, 280); // get fill color
                let color2 = getCanvasPixelColor(mapContainer, 246, 328); // get stroke color on first shape point

                expect(color1).to.equal('#c3ed7e');
                expect(color2).to.equal('#576cd5');

                resolve();
            }, 100);
        });
    });

    it('style feature with opacity, validate its new style', async function() {
        // set style for the added feature
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'opacity': 0.6, 'fill': '#9be128', 'stroke': '#3750cd', 'strokeWidth': 15},
                {'zIndex': 1, 'type': 'Polygon', 'opacity': 1, 'fill': '#ff0000', 'stroke': '#906fff', 'strokeWidth': 15}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = getCanvasPixelColor(mapContainer, 380, 280); // get fill color
                let color2 = getCanvasPixelColor(mapContainer, 247, 327); // get stroke color on first shape point

                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#906fff');

                resolve();
            }, 100);
        });
    });
});
