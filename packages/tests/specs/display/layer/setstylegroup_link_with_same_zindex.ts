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
import dataset from './setstylegroup_link_with_same_zindex.json';
import {click} from 'triggerEvents';

describe('setStyleGroup link with same zIndex', () => {
    const expect = chai.expect;

    let linkLayer;
    let buildingLayer;
    let display;
    let mapContainer;
    let feature;
    let building;

    before(async () => {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.684292, latitude: 21.190383},
            zoomlevel: 18,
            maxLevel: 22,
            layers: preparedData.getLayers()
        });

        await waitForViewportReady(display);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');
        buildingLayer = preparedData.getLayers('buildingLayer');

        feature = preparedData.getFeature('linkLayer', '123');
        building = preparedData.getFeature('buildingLayer', '123');
    });

    after(async () => {
        display.destroy();
    });

    it('style feature with different zIndex, validate its style', async () => {
        // set style for the added feature with different zIndex, same color
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 18},
                {'zIndex': 1, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 8}
            ]);

        // validate features have new style
        // get color of link inline
        // get color of link outline
        let colors = await getCanvasPixelColor(mapContainer, [{x: 450, y: 300}, {x: 450, y: 304}]);
        expect(colors[0]).to.equal('#be6b65');
        expect(colors[1]).to.equal('#be6b65');
    });

    it('style feature with different stroke color, validate its style', async () => {
        // set style for the added feature with same zIndex, different color
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 18},
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#ffffff', 'strokeWidth': 8}
            ]);

        // validate features have new style
        // get color of link inline
        // get color of link outline
        let colors1 = await getCanvasPixelColor(mapContainer, [{x: 450, y: 300}, {x: 450, y: 306}]);
        expect(colors1[1]).to.equal('#be6b65');


        // set style for the added feature with same zIndex, different color
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#ffffff', 'strokeWidth': 8},
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 18}
            ]);

        // validate features have new style
        // get color of link inline
        // get color of link outline
        let colors2 = await getCanvasPixelColor(mapContainer, [{x: 450, y: 300}, {x: 450, y: 306}]);
        expect(colors2[1]).to.equal('#be6b65');
    });

    it('style feature with different stroke width, validate its style', async () => {
        // set style for the added feature with same zIndex, different strokewidth
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 18},
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 8}
            ]);

        // validate features have new style
        // get color of link inline
        // get color of link outline
        let colors1 = await getCanvasPixelColor(mapContainer, [{x: 450, y: 300}, {x: 450, y: 306}]);
        expect(colors1[0]).to.equal('#be6b65');
        expect(colors1[1]).to.equal('#be6b65');

        // set style for the added feature with same zIndex, different strokewidth
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 8},
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 18}
            ]);

        // validate features have new style
        // get color of link inline
        // get color of link outline
        let colors2 = await getCanvasPixelColor(mapContainer, [{x: 450, y: 300}, {x: 450, y: 306}]);
        expect(colors2[0]).to.equal('#be6b65');
        expect(colors2[1]).to.equal('#be6b65');
    });

    it('style feature with same zIndex and style, opacity set to 0.5, validate its style', async () => {
        // style build as background color
        buildingLayer.setStyleGroup(
            building, [{
                'zIndex': 0, 'type': 'Polygon', 'fill': '#000000', 'stroke': '#000000'
            }]);

        // set style for the added feature with same zIndex and color
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 0.5, 'stroke': '#ffffff', 'strokeWidth': 18},
                {'zIndex': 0, 'type': 'Line', 'opacity': 0.5, 'stroke': '#ffffff', 'strokeWidth': 18}
            ]);

        // validate features have new style
        // get color of link in the middle
        let color = await getCanvasPixelColor(mapContainer, {x: 450, y: 300});
        expect(color).to.equal('#bfbfbf');
    });

    it('style feature with different zIndex and style, validate its style', async () => {
        // set style for the added feature with same zIndex and color
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Line', 'opacity': 0.5, 'stroke': '#ffffff', 'strokeWidth': 18},
                {'zIndex': 1, 'type': 'Line', 'opacity': 0.5, 'stroke': '#ffffff', 'strokeWidth': 18}
            ]);

        // validate features have new style
        // get color of link in the middle
        let color = await getCanvasPixelColor(mapContainer, {x: 450, y: 300});
        expect(color).to.equal('#bfbfbf');
    });

    it('style feature with same zIndex 1 and style, validate its style', async () => {
        // set style for the added feature with same zIndex and color
        linkLayer.setStyleGroup(
            feature, [
                {'zIndex': 1, 'type': 'Line', 'opacity': 0.5, 'stroke': '#ffffff', 'strokeWidth': 18},
                {'zIndex': 1, 'type': 'Line', 'opacity': 0.5, 'stroke': '#ffffff', 'strokeWidth': 18}
            ]);

        // validate features have new style
        // get color of link in the middle
        let color = await getCanvasPixelColor(mapContainer, {x: 450, y: 300});
        expect(color).to.equal('#bfbfbf');
    });

    it('set strokeWidth in meter', async () => {
        // set style for the added feature
        linkLayer.setStyleGroup(feature, [
            {'zIndex': 3, 'type': 'Line', 'stroke': 'blue', 'strokeWidth': 2},
            {
                'zIndex': 1, 'type': 'Line', 'stroke': '#ff0000', 'strokeWidth': '50m'
            }]);
        const colors = await getCanvasPixelColor(mapContainer, {x: 500, y: 300 - 40});
        expect(colors).to.equal('#ff0000');
    });

    it('zoom in and validate strokeWidth in meter is double in size', async () => {
        await waitForViewportReady(display, () => display.setZoomlevel(display.getZoomlevel() + 1));
        const colors = await getCanvasPixelColor(mapContainer, {x: 500, y: 300 - 80});
        expect(colors).to.equal('#ff0000');
    });


    it('validate pointer-events for meter width', async () => {
        const listener = new Listener(display, ['pointerdown', 'pointerup']);

        await click(mapContainer, 500, 220);

        const {pointerdown, pointerup} = listener.stop();

        expect(pointerdown).to.have.lengthOf(1);
        expect(pointerdown[0]).to.deep.include({
            button: 0,
            mapX: 500,
            mapY: 220,
            type: 'pointerdown'
        });

        expect(pointerup).to.have.lengthOf(1);
        const {geometry} = (<any>pointerup[0]).target;
        expect(geometry).to.deep.include({type: 'LineString'});
    });


    it('validate pointer-events for meter width, zoom>20', async () => {
        const listener = new Listener(display, ['pointerdown', 'pointerup']);

        await waitForViewportReady(display, () => display.setZoomlevel(21));
        await click(mapContainer, 500, 599);

        const {pointerdown, pointerup} = listener.stop();

        expect(pointerdown).to.have.lengthOf(1);
        expect(pointerdown[0]).to.deep.include({
            button: 0,
            mapX: 500,
            mapY: 599,
            type: 'pointerdown'
        });

        expect(pointerup).to.have.lengthOf(1);
        const {geometry} = (<any>pointerup[0]).target;
        expect(geometry).to.deep.include({type: 'LineString'});
    });
});
