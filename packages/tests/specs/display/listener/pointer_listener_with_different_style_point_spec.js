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
import dataset from './pointer_listener_with_different_style_point_spec.json';

describe('pointer listener with different style point', function() {
    const expect = chai.expect;

    let preparedData;
    let mapContainer;
    let poiLayer;
    let styles;
    let display;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.044927, latitude: 20.407239},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });

        await displayTests.waitForViewportReady(display);

        mapContainer = display.getContainer();

        poiLayer = preparedData.getLayers('placeLayer');
        styles = poiLayer.getStyle();
    });

    after(async function() {
        display.destroy();
        await preparedData.clear();
    });

    it('valite pointdown and up on link', async function() {
        let listener = new testUtils.Listener(display, ['pointerdown', 'pointerup']);

        await testUtils.events.click(mapContainer, 321, 311);

        let results = listener.stop();
        expect(results.pointerdown).to.have.lengthOf(1);
        expect(results.pointerdown[0]).to.deep.include({
            button: 0,
            mapX: 321,
            mapY: 311,
            type: 'pointerdown'
        });
        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 321,
            mapY: 311,
            type: 'pointerup'
        });
    });

    it('validate style', function() {
        expect(poiLayer.getStyle().styleGroups['Point'][0]).to.deep.include({
            zIndex: 0, type: 'Circle', radius: 6, fill: '#ff0000'
        });
    });

    it('set style and validate point down and up events', async function() {
        poiLayer.setStyle({
            styleGroups: {
                styles: [
                    {'zIndex': 0, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 16}
                    // ,
                    // {zIndex: 1, type: "Text", text: null,fill:"#ffffff"}
                ]
            },
            assign: function(feature, zoomlevel) {
                return 'styles';
            }
        });

        display.refresh(poiLayer);


        let listener = new testUtils.Listener(display, ['pointerdown', 'pointerup']);
        await testUtils.events.click(mapContainer, 321, 311);

        let results = listener.stop();
        expect(results.pointerdown).to.have.lengthOf(1);
        expect(results.pointerdown[0]).to.deep.include({
            button: 0,
            mapX: 321,
            mapY: 311,
            type: 'pointerdown'
        });
        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 321,
            mapY: 311,
            type: 'pointerup'
        });

        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 282, 203);
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 272, 203);
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 248, 203);
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 239, 203);

                expect(color1).to.equal('#ffffff');
                expect(color2).to.equal('#be6b65');
                expect(color3).to.equal('#be6b65');
                expect(color4).to.equal('#ffffff');

                resolve();
            }, 100);
        });
    });


    it('reset style and validate', async function() {
        poiLayer.setStyle(styles);

        display.refresh(poiLayer);

        await new Promise((resolve) => {
            setTimeout(() => {
                let color = testUtils.getCanvasPixelColor(mapContainer, 254, 205);
                expect(color).to.equal('#ff0000');
                resolve();
            }, 100);
        });
    });
});
