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
import dataset from './pointer_listener_with_different_style_link_spec.json';

describe('pointer listener with different style link', function() {
    const expect = chai.expect;

    let preparedData;
    let mapContainer;
    let linkLayer;
    let styles;
    let display;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.02577646944563, latitude: 20.52517531632165},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });

        await displayTests.waitForViewportReady(display);

        mapContainer = display.getContainer();

        linkLayer = preparedData.getLayers('linkLayer');
        styles = linkLayer.getStyle();
    });

    after(async function() {
        display.destroy();
        await preparedData.clear();
    });

    it('click on link and validate pointer events', async function() {
        let listener = new testUtils.Listener(display, ['pointerdown', 'pointerup']);


        await testUtils.events.click(mapContainer, 605, 310);

        let results = listener.stop();
        expect(results.pointerdown).to.have.lengthOf(1);
        expect(results.pointerdown[0]).to.deep.include({
            button: 0,
            mapX: 605,
            mapY: 310,
            type: 'pointerdown'
        });
        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 605,
            mapY: 310,
            type: 'pointerup'
        });
    });

    it('set link style and validate pointer events on link objects', async function() {
        linkLayer.setStyle({
            styleGroups: {
                myStyles: [
                    {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#ff0000', 'strokeWidth': 16},
                    {'zIndex': 1, 'type': 'Line', 'opacity': 1, 'stroke': '#ff00ff', 'strokeWidth': 8}
                ]
            },
            assign: function(feature, zoomlevel) {
                return 'myStyles';
            }
        });

        display.refresh(linkLayer);

        let listener = new testUtils.Listener(display, ['pointerdown', 'pointerup']);

        await testUtils.events.click(mapContainer, 322, 309);

        let results = listener.stop();
        expect(results.pointerdown).to.have.lengthOf(1);
        expect(results.pointerdown[0]).to.deep.include({
            button: 0,
            mapX: 322,
            mapY: 309,
            type: 'pointerdown'
        });
        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 322,
            mapY: 309,
            type: 'pointerup'
        });

        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 395, 294);
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 395, 303);
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 395, 310);
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 395, 316);
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 395, 322);

                expect(color1).to.equal('#ffffff');
                expect(color2).to.equal('#ff0000');
                expect(color3).to.equal('#ff00ff');
                expect(color4).to.equal('#ff0000');
                expect(color5).to.equal('#ffffff');

                resolve();
            }, 100);
        });
    });

    it('reset layer style and validate', async function() {
        linkLayer.setStyle(styles);

        display.refresh(linkLayer);

        await new Promise((resolve) => {
            setTimeout(() => {
                let color = testUtils.getCanvasPixelColor(mapContainer, 322, 309);
                expect(color).to.equal('#ff0000');
                resolve();
            }, 100);
        });
    });
});
