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
import {getCanvasPixelColor, prepare} from 'utils';
import {Map} from '@here/xyz-maps-display';
import dataset from './setstylegroup_point_text.json';

let FONT = 'bold 48px Arial,Helvetica,sans-serif';

const FULL_BLOCK_CHAR = '\u2588';

describe('setStyleGroup Point with text', function() {
    const expect = chai.expect;

    let paLayer;
    let display;
    let mapContainer;
    let feature;

    before(async () => {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.124442, latitude: 20.181623},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        await waitForViewportReady(display);

        mapContainer = display.getContainer();
        paLayer = preparedData.getLayers('paLayer');

        // add a feature
        feature = preparedData.getFeature('paLayer', '123');
    });

    after(async () => {
        display.destroy();
    });

    it('style basic text', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 128, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': '\u2588 \u2588', 'font': FONT}
            ]);

        //     #     #
        // c1 c2 c2 c3 c4
        let colors = await getCanvasPixelColor(mapContainer, [
            {x: 350, y: 300}, {x: 375, y: 300}, {x: 400, y: 300}, {x: 425, y: 300}, {x: 450, y: 300}
        ]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#ff0000');
        expect(colors[3]).to.equal('#000000');
        expect(colors[4]).to.equal('#ff0000');
    });

    it('style text with opacity', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 128, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': FULL_BLOCK_CHAR, 'opacity': 0.5, 'font': FONT}
            ]);


        let colors = await getCanvasPixelColor(mapContainer, [{x: 375, y: 300}, {x: 400, y: 300}, {x: 425, y: 300}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#bf0000');
        expect(colors[2]).to.equal('#ff0000');
    });

    it('style text with textRef', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'textRef': 'properties.address', 'font': FONT}
            ]);

        let colors = await getCanvasPixelColor(mapContainer, [
            {x: 375, y: 300}, {x: 388, y: 300}, {x: 400, y: 300}, {x: 414, y: 300}, {x: 425, y: 300}
        ]);

        expect(colors[0]).to.equal('#ff0000'); // color left of "O"
        expect(colors[1]).to.equal('#000000'); // color on left arc of "O"
        expect(colors[2]).to.equal('#ff0000'); // color center "O"
        expect(colors[3]).to.equal('#000000'); // color on right arc of "O"
        expect(colors[4]).to.equal('#ff0000'); // color right of "O"
    });

    it('style text with positive offsetX', async () => {
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 128, 'height': 128, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': FULL_BLOCK_CHAR, 'font': FONT, 'offsetX': 24}
            ]);

        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 425, y: 300}, {x: 450, y: 300}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#ff0000');
    });

    it('style text with negative offsetX', async () => {
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': FULL_BLOCK_CHAR, 'font': FONT, 'offsetX': -24}
            ]);

        let colors = await getCanvasPixelColor(mapContainer, [{x: 355, y: 300}, {x: 375, y: 300}, {x: 400, y: 300}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#ff0000');
    });

    it('style text with positive offsetY', async () => {
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 128, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': FULL_BLOCK_CHAR, 'font': FONT, 'offsetY': 24}
            ]);

        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 350}, {x: 400, y: 325}, {x: 400, y: 295}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#ff0000');
    });

    it('style text with offsetY', async () => {
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 128, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': FULL_BLOCK_CHAR, 'font': FONT, 'offsetY': -24}
            ]);

        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 250}, {x: 400, y: 280}, {x: 400, y: 305}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#ff0000');
    });

    it('style text with offsetX and offsetY', async () => {
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 128, 'height': 128, 'opacity': 1, 'fill': '#ff0000'},
                {
                    'zIndex': 1,
                    'type': 'Text',
                    'fill': '#000000',
                    'text': FULL_BLOCK_CHAR,
                    'font': FONT,
                    'offsetX': 24,
                    'offsetY': 24
                }
            ]);

        let colors = await getCanvasPixelColor(mapContainer, [
            {x: 400, y: 325}, {x: 425, y: 355}, {x: 445, y: 325}, {x: 425, y: 300}, {x: 425, y: 325}
        ]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#ff0000');
        expect(colors[2]).to.equal('#ff0000');
        expect(colors[3]).to.equal('#ff0000');
        expect(colors[4]).to.equal('#000000');
    });

    it('validate text is not wrapped by default', async () => {
        paLayer.setStyleGroup(
            feature, [{
                zIndex: 0,
                type: 'Text',
                fill: '#ff0000',
                font: 'bold 48px Arial,Helvetica,sans-serif',
                text: '\u2588 \u2588 \u2588',
                collide: false,
                priority: 1
            }]);

        // O O O
        let colors = await getCanvasPixelColor(mapContainer, [{x: 350, y: 300}, {x: 400, y: 300}, {x: 450, y: 300}]);

        for (let color of colors) {
            expect(color).to.equal('#ff0000');
        }
    });

    it('validate text wrap 1 char', async () => {
        paLayer.setStyleGroup(
            feature, [{
                zIndex: 0,
                type: 'Text',
                fill: '#ff0000',
                font: 'bold 48px Arial,Helvetica,sans-serif',
                text: '\u2588 \u2588 \u2588',
                collide: false,
                priority: 1,
                lineWrap: 1
            }]);

        //   O
        //   O
        //   O
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 250}, {x: 400, y: 300}, {x: 400, y: 350}]);

        for (let color of colors) {
            expect(color).to.equal('#ff0000');
        }
    });

    it('validate text wrap 3 chars', async () => {
        paLayer.setStyleGroup(
            feature, [{
                zIndex: 0,
                type: 'Text',
                fill: '#ff0000',
                font: 'bold 48px Arial,Helvetica,sans-serif',
                text: '\u2588 \u2588 \u2588',
                collide: false,
                priority: 1,
                lineWrap: 3
            }]);

        //  O O
        //   O
        let colors = await getCanvasPixelColor(mapContainer, [{x: 375, y: 275}, {x: 425, y: 275}, {x: 400, y: 325}]);

        for (let color of colors) {
            expect(color).to.equal('#ff0000');
        }
    });

    it('validate explicit line break', async () => {
        paLayer.setStyleGroup(
            feature, [{
                zIndex: 0,
                type: 'Text',
                fill: '#ff0000',
                font: 'bold 48px Arial,Helvetica,sans-serif',
                text: '\u2588\n\u2588\n\u2588',
                collide: false,
                priority: 1,
                lineWrap: 13
            }]);

        //   O
        //   O
        //   O
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 250}, {x: 400, y: 300}, {x: 400, y: 350}]);

        for (let color of colors) {
            expect(color).to.equal('#ff0000');
        }
    });
});
