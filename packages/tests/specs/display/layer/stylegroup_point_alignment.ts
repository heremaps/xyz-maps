/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
import {getCanvasPixelColor} from 'utils';
import {Map} from '@here/xyz-maps-display';
import {TileLayer, LocalProvider} from '@here/xyz-maps-core';

describe('stylegroup Point alignment', function() {
    const expect = chai.expect;

    const FULL_BLOCK_CHAR = '\u2588';
    let FONT = 'bold 30px Arial,Helvetica,sans-serif';

    let mapContainer;
    let display;
    let feature;
    let layer;

    before(async () => {
        const center = {longitude: 73.075272, latitude: 19.931463};

        layer = new TileLayer({provider: new LocalProvider()});

        feature = layer.addFeature({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [center.longitude, center.latitude]
            }
        });

        mapContainer = document.getElementById('map');
        display = new Map(mapContainer, {
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center,
            zoomlevel: 18,
            layers: [layer]
        });


        await waitForViewportReady(display);
    });

    after(async () => {
        display.destroy();
    });

    it('Rect: style default alignment', async () => {
        // set style for the added feature
        layer.setStyleGroup(feature, [{
            zIndex: 0, type: 'Rect', width: 64, height: 64, fill: '#ff0000'
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#ff0000');
    });

    it('Rect: style default alignment "map"', async () => {
        // set style for the added feature
        layer.setStyleGroup(feature, [{
            zIndex: 0, type: 'Rect', width: 64, height: 64, fill: '#0000ff', alignment: 'map'
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#0000ff');
    });

    it('Rect: style default alignment "viewport"', async () => {
        // set style for the added feature
        layer.setStyleGroup(feature, [{
            zIndex: 0, type: 'Rect', width: 64, height: 64, fill: '#00ff00', alignment: 'viewport'
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#00ff00');
    });

    it('Circle: style default alignment', async () => {
        // set style for the added feature
        layer.setStyleGroup(feature, [{
            zIndex: 0, type: 'Circle', radius: 32, fill: '#ff0000'
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#ff0000');
    });

    it('Circle: style default alignment "map"', async () => {
        // set style for the added feature
        layer.setStyleGroup(feature, [{
            zIndex: 0, type: 'Circle', radius: 32, fill: '#0000ff', alignment: 'map'
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#0000ff');
    });

    it('Circle: style default alignment "viewport"', async () => {
        // set style for the added feature
        layer.setStyleGroup(feature, [{
            zIndex: 0, type: 'Circle', radius: 32, fill: '#00ff00', alignment: 'viewport'
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#00ff00');
    });

    it('Image: style default alignment', async () => {
        const redImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVR42mP8z8AARLgB48hQAAAdEw/5itjcFgAAAABJRU5ErkJggg==';

        layer.setStyleGroup(feature, [{
            zIndex: 0, type: 'Image', width: 64, height: 64, fill: '#ff0000', src: redImg
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 390, y: 290});

        expect(color).to.equal('#ff0000');
    });

    it('Image: style default alignment "map"', async () => {
        const blueImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVR42mNkYPj/nwEPYBwZCgANIw/5um5PVwAAAABJRU5ErkJggg==';
        layer.setStyleGroup(feature, [{
            zIndex: 0, type: 'Image', width: 64, height: 64, fill: '#0000ff', alignment: 'map', src: blueImg
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 390, y: 290});

        expect(color).to.equal('#0000ff');
    });

    it('Image: style default alignment "viewport"', async () => {
        const greenImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR42mNk+A+EeADjyFAAABUbD/numdZpAAAAAElFTkSuQmCC';
        layer.setStyleGroup(feature, [{
            zIndex: 0, type: 'Image', width: 64, height: 64, fill: '#00ff00', alignment: 'viewport', src: greenImg
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 390, y: 290});

        expect(color).to.equal('#00ff00');
    });

    it('Text: style default alignment', async () => {
        // set style for the added feature
        layer.setStyleGroup(feature, [{
            zIndex: 0, type: 'Text', fill: '#ff0000', font: FONT, text: FULL_BLOCK_CHAR
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#ff0000');
    });

    it('Text: style default alignment "map"', async () => {
        // set style for the added feature
        layer.setStyleGroup(feature, [{
            zIndex: 0, type: 'Text', fill: '#0000ff', alignment: 'map', font: FONT, text: FULL_BLOCK_CHAR
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#0000ff');
    });

    it('Text: style default alignment "viewport"', async () => {
        // set style for the added feature
        layer.setStyleGroup(feature, [{
            zIndex: 0, type: 'Text', fill: '#00ff00', alignment: 'viewport', font: FONT, text: FULL_BLOCK_CHAR
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#00ff00');
    });
});
