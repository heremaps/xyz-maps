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
import chaiAlmost from 'chai-almost';
import dataset from './setstylegroup_point_rect.json';
import {click} from 'triggerEvents';

describe('setStyleGroup Point with rect', function() {
    const expect = chai.expect;

    let paLayer;
    let display;
    let mapContainer;
    let feature;

    before(async () => {
        chai.use(chaiAlmost(1));
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.075272, latitude: 19.931463},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        await waitForViewportReady(display);

        mapContainer = display.getContainer();
        paLayer = preparedData.getLayers('paLayer');

        // get a feature
        feature = preparedData.getFeature('paLayer', '123');
    });

    after(async () => {
        display.destroy();
    });

    it('style feature and validate', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 30, 'height': 30, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        // get color at left border
        // get color at right border
        // get color at top border
        // get color of bottom border
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 391, y: 300}, {x: 409, y: 300}, {
            x: 400,
            y: 291
        }, {x: 400, y: 309}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#000000');
        expect(colors[3]).to.equal('#000000');
        expect(colors[4]).to.equal('#000000');
    });

    it('style feature with opacity, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                // fill and opacity values makes sure alpha blending these two colors will produce integer color value 0x99 (0xff * 0.6)
                {'zIndex': 0, 'type': 'Rect', 'width': 30, 'height': 30, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 0.6, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        // get color at left border
        // get color at right border
        // get color at top border
        // get color of bottom border
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 391, y: 300}, {x: 409, y: 300}, {
            x: 400,
            y: 291
        }, {x: 400, y: 309}]);

        expect(colors[0]).to.equal('#990000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#000000');
        expect(colors[3]).to.equal('#000000');
        expect(colors[4]).to.equal('#000000');
    });

    it('style feature with rotation, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 30, 'height': 30, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'rotation': 45, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        // get color at left border
        // get color at right border
        // get color at top border
        // get color of bottom border
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 391, y: 300}, {x: 409, y: 300}, {
            x: 400,
            y: 291
        }, {x: 400, y: 309}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#ff0000');
        expect(colors[2]).to.equal('#ff0000');
        expect(colors[3]).to.equal('#ff0000');
        expect(colors[4]).to.equal('#ff0000');
    });

    it('style feature with offsetX, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 30, 'height': 30, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'offsetX': 5, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        // get color at left border
        // get color at right border
        // get color at top border
        // get color of bottom border
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 391, y: 300}, {x: 409, y: 300}, {
            x: 400,
            y: 291
        }, {x: 400, y: 309}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#ff0000');
        expect(colors[3]).to.equal('#000000');
        expect(colors[4]).to.equal('#000000');
    });

    it('style feature with offsetX again, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 30, 'height': 30, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'offsetX': -5, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        // get color at left border
        // get color at right border
        // get color at top border
        // get color of bottom border
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 391, y: 300}, {x: 409, y: 300}, {
            x: 400,
            y: 291
        }, {x: 400, y: 309}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#ff0000');
        expect(colors[2]).to.equal('#000000');
        expect(colors[3]).to.equal('#000000');
        expect(colors[4]).to.equal('#000000');
    });

    it('style feature with offsetY, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 30, 'height': 30, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'offsetY': 5, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        // get color at left border
        // get color at right border
        // get color at top border
        // get color of bottom border
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 391, y: 300}, {x: 409, y: 300}, {
            x: 400,
            y: 291
        }, {x: 400, y: 309}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#000000');
        expect(colors[3]).to.equal('#000000');
        expect(colors[4]).to.equal('#ff0000');
    });

    it('style feature with offsetY again, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Rect', 'width': 30, 'height': 30, 'opacity': 1, 'fill': '#000000'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'offsetY': -5, 'fill': '#ff0000'}
            ]);

        // validate features have new style
        // get color at left border
        // get color at right border
        // get color at top border
        // get color of bottom border
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 391, y: 300}, {x: 409, y: 300}, {
            x: 400,
            y: 291
        }, {x: 400, y: 309}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#000000');
        expect(colors[2]).to.equal('#000000');
        expect(colors[3]).to.equal('#ff0000');
        expect(colors[4]).to.equal('#000000');
    });

    it('set width in meter', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(feature, [{
            'zIndex': 0, 'type': 'Rect', 'width': '60m', 'opacity': 1, 'fill': '#ff0000'
        }]);
        const colors = await getCanvasPixelColor(mapContainer, {x: 400 - 30, y: 300 - 30});
        expect(colors).to.equal('#ff0000');
    });

    it('zoom in and validate width in meter is double in size', async () => {
        await waitForViewportReady(display, () => display.setZoomlevel(display.getZoomlevel() + 1));
        const colors = await getCanvasPixelColor(mapContainer, {x: 400 - 60, y: 300 - 60});
        expect(colors).to.equal('#ff0000');
    });


    it('validate pointer-events for meter width', async () => {
        const listener = new Listener(display, ['pointerdown', 'pointerup']);

        await click(mapContainer, 460, 360);

        const {pointerdown, pointerup} = listener.stop();

        expect(pointerdown).to.have.lengthOf(1);
        expect(pointerdown[0]).to.deep.include({
            button: 0,
            mapX: 460,
            mapY: 360,
            type: 'pointerdown'
        });

        expect(pointerup).to.have.lengthOf(1);
        const {geometry} = (<any>pointerup[0]).target;
        expect(geometry).to.deep.include({type: 'Point'});
    });
});
