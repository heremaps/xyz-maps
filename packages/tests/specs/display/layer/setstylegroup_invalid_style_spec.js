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
import chaiAlmost from 'chai-almost';
import dataset from './setstylegroup_invalid_style_spec.json';


describe('setStyleGroup with invalid style', function() {
    const expect = chai.expect;

    let linkLayer;
    let addressLayer;
    let display;
    let mapContainer;
    let link;
    let address;

    before(async function() {
        chai.use(chaiAlmost(1));
        let preparedData = await prepare(dataset);

        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 78.06609, latitude: 17.459677},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        await displayTests.waitForViewportReady(display);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');
        addressLayer = preparedData.getLayers('paLayer');

        link = preparedData.getFeature('linkLayer', '123');
        address = preparedData.getFeature('paLayer', '123');
    });

    after(async function() {
        display.destroy();
    });

    it('style link, validate its new style with invalid value', async function() {
        // set link with invalid style
        linkLayer.setStyleGroup(
            link,
            [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 16},
                'invalid'
            ]
        );

        let style = linkLayer.getStyleGroup(link);

        expect(style).to.be.deep.equal([
            {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 16},
            'invalid'
        ]);

        // validate new link style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color = testUtils.getCanvasPixelColor(mapContainer, 350, 300); // get link color

                // expect(color).to.equal('#be6b65');
                color = color.replace('#', '0x');
                // blue
                expect(parseInt(color) >> 0 & 255).to.almost.equal(101);
                // green
                expect(parseInt(color) >> 8 & 255).to.almost.equal(107);
                // red
                expect(parseInt(color) >> 16 & 255).to.almost.equal(190);
                resolve();
            }, 100);
        });

        // set link style again
        linkLayer.setStyleGroup(
            link,
            [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 16},
                {'zIndex': 2, 'type': 'invalid', 'opacity': 1, 'stroke': '2e3b35', 'strokeWidth': 'invalid'}
            ]
        );

        style = linkLayer.getStyleGroup(link);

        expect(style).to.be.deep.equal([
            {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 16},
            {'zIndex': 2, 'type': 'invalid', 'opacity': 1, 'stroke': '2e3b35', 'strokeWidth': 'invalid'}
        ]);

        // validate link style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color = testUtils.getCanvasPixelColor(mapContainer, 350, 300); // get link color

                // expect(color).to.equal('#be6b65');
                color = color.replace('#', '0x');
                // blue
                expect(parseInt(color) >> 0 & 255).to.almost.equal(101);
                // green
                expect(parseInt(color) >> 8 & 255).to.almost.equal(107);
                // red
                expect(parseInt(color) >> 16 & 255).to.almost.equal(190);
                resolve();
            }, 100);
        });
    });


    it('style address, validate its new style with invalid value', async function() {
        // set address with invalid style
        addressLayer.setStyleGroup(
            address,
            [
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'fill': '#765432'},
                'invalid'
            ]
        );

        let style = addressLayer.getStyleGroup(address);

        expect(style).to.be.deep.equal([
            {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'fill': '#765432'},
            'invalid'
        ]);

        // validate new address style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color = testUtils.getCanvasPixelColor(mapContainer, 300, 200); // get address color

                // expect(color).to.equal('#765432');
                color = color.replace('#', '0x');
                // blue
                expect(parseInt(color) >> 0 & 255).to.almost.equal(50);
                // green
                expect(parseInt(color) >> 8 & 255).to.almost.equal(84);
                // red
                expect(parseInt(color) >> 16 & 255).to.almost.equal(118);
                resolve();
            }, 100);
        });

        // set address style again
        addressLayer.setStyleGroup(
            address,
            [
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'fill': '#765432'},
                {'zIndex': 2, 'type': 'invalid', 'opacity': 1, 'stroke': '2e3b35', 'strokeWidth': 'invalid'}
            ]
        );

        style = addressLayer.getStyleGroup(address);

        expect(style).to.be.deep.equal([
            {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'fill': '#765432'},
            {'zIndex': 2, 'type': 'invalid', 'opacity': 1, 'stroke': '2e3b35', 'strokeWidth': 'invalid'}
        ]);

        // validate address style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color = testUtils.getCanvasPixelColor(mapContainer, 300, 200); // get address color

                // expect(color).to.equal('#765432');
                color = color.replace('#', '0x');
                // blue
                expect(parseInt(color) >> 0 & 255).to.almost.equal(50);
                // green
                expect(parseInt(color) >> 8 & 255).to.almost.equal(84);
                // red
                expect(parseInt(color) >> 16 & 255).to.almost.equal(118);
                resolve();
            }, 100);
        });
    });
});
