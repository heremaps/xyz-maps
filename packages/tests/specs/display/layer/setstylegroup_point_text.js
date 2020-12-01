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
import {Map} from '@here/xyz-maps-display';
import dataset from './setstylegroup_point_text.json';

let FONT = 'bold 96px Arial,Helvetica,sans-serif';

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

    it('style feature with text, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': 'H', 'font': FONT}
            ]);

        // validate features have new style
        // get color between bars of character H
        // get color of H in middle
        // get color between bars of character H
        // get color of left bar of H
        // get color of right bar of H
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 275}, {x: 400, y: 292}, {
            x: 400,
            y: 315
        }, {x: 380, y: 300}, {x: 420, y: 300}]); // get color between bars of character H

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#ff0000');
        expect(colors[3]).to.equal('#000000');
        expect(colors[4]).to.equal('#000000');
    });

    it('style feature with text and opacity, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': 'H', 'opacity': 0.5, 'font': FONT}
            ]);

        // validate features have new style
        // get color between bars of character H
        // get color of H in middle
        // get color between bars of character H
        // get color of left bar of H
        // get color of right bar of H
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 275}, {x: 400, y: 292}, {
            x: 400,
            y: 315
        }, {x: 380, y: 300}, {x: 420, y: 300}]); // get color between bars of character H

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#bf0000');
        expect(colors[2]).to.equal('#ff0000');
        expect(colors[3]).to.equal('#bf0000');
        expect(colors[4]).to.equal('#bf0000');
    });

    it('style feature with textRef, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'textRef': 'properties.address', 'font': FONT}
            ]);

        // validate features have new style
        // get color inside O(upper)
        // get color inside O(middle)
        // get color inside O(lower)
        // get color on O
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 280}, {x: 400, y: 297}, {
            x: 400,
            y: 307
        }, {x: 425, y: 300}]); // get color between bars of character H

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#ff0000');
        expect(colors[2]).to.equal('#ff0000');
        expect(colors[3]).to.equal('#000000');
    });

    it('style feature with text and offsetX, validate its style', async () => {
        // set style for the added feature, offsetX is set to 5
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': 'H', 'font': FONT, 'offsetX': 10}
            ]);

        // validate features have new style
        // get color between bars of character H
        // get color of H in middle
        // get color between bars of character H
        // get color of left bar of H
        // get color of right bar of H
        let colors = await getCanvasPixelColor(mapContainer, [{x: 410, y: 275}, {x: 410, y: 292}, {
            x: 410,
            y: 315
        }, {x: 390, y: 300}, {x: 430, y: 300}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#ff0000');
        expect(colors[3]).to.equal('#000000');
        expect(colors[4]).to.equal('#000000');
    });

    it('style feature with text and offsetX again, validate its style', async () => {
        // set style for the added feature, offsetX is set to -5
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': 'H', 'font': FONT, 'offsetX': -10}
            ]);

        // validate features have new style
        // get color between bars of character H
        // get color of H in middle
        // get color between bars of character H
        // get color of left bar of H
        // get color of right bar of H
        let colors = await getCanvasPixelColor(mapContainer, [{x: 390, y: 275}, {x: 390, y: 292}, {
            x: 390,
            y: 315
        }, {x: 370, y: 300}, {x: 410, y: 300}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#ff0000');
        expect(colors[3]).to.equal('#000000');
        expect(colors[4]).to.equal('#000000');
    });

    it('style feature with text and offsetY, validate its style', async () => {
        // set style for the added feature, offsetY is set to 5
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': 'H', 'font': FONT, 'offsetY': 10}
            ]);

        // validate features have new style
        // get color between bars of character H
        // get color of H in middle
        // get color between bars of character H
        // get color of left bar of H
        // get color of right bar of H
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 285}, {x: 400, y: 302}, {
            x: 400,
            y: 325
        }, {x: 380, y: 310}, {x: 420, y: 310}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#ff0000');
        expect(colors[3]).to.equal('#000000');
        expect(colors[4]).to.equal('#000000');
    });

    it('style feature with text and offsetY again, validate its style', async () => {
        // set style for the added feature, offsetY is set to -5
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {'zIndex': 1, 'type': 'Text', 'fill': '#000000', 'text': 'H', 'font': FONT, 'offsetY': -10}
            ]);

        // validate features have new style
        // get color between bars of character H
        // get color of H in middle
        // get color between bars of character H
        // get color of left bar of H
        // get color of right bar of H
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 265}, {x: 400, y: 282}, {
            x: 400,
            y: 305
        }, {x: 380, y: 290}, {x: 420, y: 290}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#ff0000');
        expect(colors[3]).to.equal('#000000');
        expect(colors[4]).to.equal('#000000');
    });

    it('style feature with text and offsetX, offsetY, validate its style', async () => {
        // set style for the added feature, both offsetX and offsetY are set to 5
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 96, 'height': 96, 'opacity': 1, 'fill': '#ff0000'},
                {
                    'zIndex': 1,
                    'type': 'Text',
                    'fill': '#000000',
                    'text': 'H',
                    'font': FONT,
                    'offsetX': 10,
                    'offsetY': 10
                }
            ]);

        // validate features have new style
        // get color between bars of character H
        // get color of H in middle
        // get color between bars of character H
        // get color of left bar of H
        // get color of right bar of H
        let colors = await getCanvasPixelColor(mapContainer, [{x: 410, y: 285}, {x: 410, y: 302}, {
            x: 410,
            y: 325
        }, {x: 390, y: 310}, {x: 430, y: 310}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#ff0000');
        expect(colors[3]).to.equal('#000000');
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
});
