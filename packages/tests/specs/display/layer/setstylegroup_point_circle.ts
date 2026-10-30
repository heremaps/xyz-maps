/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
import {getCanvasPixelColor, Listener, prepare} from 'utils';
import {Map} from '@here/xyz-maps-display';
import dataset from './setstylegroup_point_circle.json';
import {click} from 'triggerEvents';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('setStyleGroup Point with circle', function() {
    let paLayer;
    let display;
    let mapContainer;
    let feature;

    beforeAll(async () => {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.549401, latitude: 19.815739},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        await waitForViewportReady(display);

        mapContainer = display.getContainer();
        paLayer = preparedData.getLayers('paLayer');

        // get a feature
        feature = preparedData.getFeature('paLayer', '123');
    });

    afterAll(() => {
        display.destroy();
    });

    it('style feature and validate', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Circle', 'radius': 14, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Circle', 'radius': 10, 'opacity': 1, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        // get color of inner circle
        // get color at left border
        // get color at right border
        // get color at top border
        // get color of bottom border
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 388, y: 300}, {x: 412, y: 300}, {
            x: 400,
            y: 288
        }, {x: 400, y: 312}], {
            expect: ['#ff0000', '#000000', '#000000', '#000000', '#000000']
        });

        expect(colors[0]).toBe('#ff0000');
        expect(colors[1]).toBe('#000000');
        expect(colors[2]).toBe('#000000');
        expect(colors[3]).toBe('#000000');
        expect(colors[4]).toBe('#000000');
    });

    it('style feature with offsetX and validate', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Circle', 'radius': 14, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Circle', 'radius': 10, 'opacity': 1, 'offsetX': 4, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        // get color of inner circle
        // get color at left border
        // get color at right border
        // get color at top border
        // get color of bottom border
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 388, y: 300}, {x: 412, y: 300}, {
            x: 400,
            y: 288
        }, {x: 400, y: 312}], {
            expect: ['#ff0000', '#000000', '#ff0000', '#000000', '#000000']
        });

        expect(colors[0]).toBe('#ff0000');
        expect(colors[1]).toBe('#000000');
        expect(colors[2]).toBe('#ff0000');
        expect(colors[3]).toBe('#000000');
        expect(colors[4]).toBe('#000000');
    });

    it('style feature with offsetX again and validate', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Circle', 'radius': 14, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Circle', 'radius': 10, 'opacity': 1, 'offsetX': -4, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        // get color of inner circle
        // get color at left border
        // get color at right border
        // get color at top border
        // get color of bottom border
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 388, y: 300}, {x: 412, y: 300}, {
            x: 400,
            y: 288
        }, {x: 400, y: 312}], {
            expect: ['#ff0000', '#ff0000', '#000000', '#000000', '#000000']
        });

        expect(colors[0]).toBe('#ff0000');
        expect(colors[1]).toBe('#ff0000');
        expect(colors[2]).toBe('#000000');
        expect(colors[3]).toBe('#000000');
        expect(colors[4]).toBe('#000000');
    });

    it('style feature with offsetY and validate', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Circle', 'radius': 14, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Circle', 'radius': 10, 'opacity': 1, 'offsetY': 4, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        // get color of inner circle
        // get color at left border
        // get color at right border
        // get color at top border
        // get color of bottom border
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 388, y: 300}, {x: 412, y: 300}, {
            x: 400,
            y: 288
        }, {x: 400, y: 312}], {
            expect: ['#ff0000', '#000000', '#000000', '#000000', '#ff0000']
        });

        expect(colors[0]).toBe('#ff0000');
        expect(colors[1]).toBe('#000000');
        expect(colors[2]).toBe('#000000');
        expect(colors[3]).toBe('#000000');
        expect(colors[4]).toBe('#ff0000');
    });

    it('style feature with offsetY again and validate', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Circle', 'radius': 14, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Circle', 'radius': 10, 'opacity': 1, 'offsetY': -4, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        // get color of inner circle
        // get color at left border
        // get color at right border
        // get color at top border
        // get color of bottom border
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 388, y: 300}, {x: 412, y: 300}, {
            x: 400,
            y: 288
        }, {x: 400, y: 312}], {
            expect: ['#ff0000', '#000000', '#000000', '#ff0000', '#000000']
        });

        expect(colors[0]).toBe('#ff0000');
        expect(colors[1]).toBe('#000000');
        expect(colors[2]).toBe('#000000');
        expect(colors[3]).toBe('#ff0000');
        expect(colors[4]).toBe('#000000');
    });

    it('style feature with fill and stroke color', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Circle', 'radius': 14, 'opacity': 1, 'fill': '#000000', 'stroke': '#ffff00', 'strokeWidth': 7},
                {'zIndex': 1, 'type': 'Circle', 'radius': 10, 'opacity': 1, 'fill': '#ff0000'}
            ]);

        // validate features have new style

        // get color of inner circle
        // get color at left border
        // get color at right border
        // get color at top border
        // get color of bottom border
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 388, y: 300}, {x: 412, y: 300}, {
            x: 400,
            y: 288
        }, {x: 400, y: 312}], {
            expect: ['#ff0000', '#ffff00', '#ffff00', '#ffff00', '#ffff00']
        });

        expect(colors[0]).toBe('#ff0000');
        expect(colors[1]).toBe('#ffff00');
        expect(colors[2]).toBe('#ffff00');
        expect(colors[3]).toBe('#ffff00');
        expect(colors[4]).toBe('#ffff00');
    });

    it('set radius in meter', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(feature, [{
            'zIndex': 0, 'type': 'Circle', 'radius': '30m', 'opacity': 1, 'fill': '#ff0000'
        }]);
        const colors = await getCanvasPixelColor(mapContainer, {x: 400 - 30, y: 300 - 30}, {
            expect: '#ff0000'
        });
        expect(colors).toBe('#ff0000');
    });

    it('zoom in and validate radius in meter is double in size', async () => {
        await waitForViewportReady(display, () => display.setZoomlevel(display.getZoomlevel() + 1));
        const colors = await getCanvasPixelColor(mapContainer, {x: 400 - 60, y: 300 - 60}, {
            expect: '#ff0000'
        });
        expect(colors).toBe('#ff0000');
    });


    it('validate pointer-events for meter radius', async () => {
        const listener = new Listener(display, ['pointerdown', 'pointerup']);

        await click(mapContainer, 460, 360);

        const {pointerdown, pointerup} = listener.stop();

        expect(pointerdown).toHaveLength(1);
        expect(pointerdown[0]).toEqual(expect.objectContaining({
            button: 0,
            mapX: 460,
            mapY: 360,
            type: 'pointerdown'
        }));

        expect(pointerup).toHaveLength(1);
        const {geometry} = (<any>pointerup[0]).target;
        expect(geometry).toEqual(expect.objectContaining({type: 'Point'}));
    });
});
