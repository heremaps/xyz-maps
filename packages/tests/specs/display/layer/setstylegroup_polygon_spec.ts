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
import {getCanvasPixelColor, prepare} from 'utils';
import {Map} from '@here/xyz-maps-display';
import dataset from './setstylegroup_polygon_spec.json';
import chaiAlmost from 'chai-almost';
import {TileLayer} from '@here/xyz-maps-core';

const IMG_SRC_RED = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVR42mP8z8AARLgB48hQAAAdEw/5itjcFgAAAABJRU5ErkJggg==';
const IMG_SRC_BLUE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVR42mNkYPj/nwEPYBwZCgANIw/5um5PVwAAAABJRU5ErkJggg==';

const FULL_BLOCK_CHAR = '\u2588';
const FONT = 'bold 30px Arial,Helvetica,sans-serif';

describe('setStyleGroup Polygon', () => {
    const expect = chai.expect;

    let buildingLayer: TileLayer;
    let display;
    let mapContainer;
    let feature;

    before(async () => {
        chai.use(chaiAlmost(1e-7));
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.472006, latitude: 21.404435},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        await waitForViewportReady(display);

        mapContainer = display.getContainer();
        buildingLayer = preparedData.getLayers('buildingLayer');

        // get feature
        feature = preparedData.getFeature('buildingLayer', '123');
    });

    after(async () => {
        display.destroy();
    });

    it('style feature, validate its new style', async () => {
        // set style for the added feature
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'opacity': 1, 'fill': '#9fe030', 'stroke': '#906fff', 'strokeWidth': 15}
            ]);

        // validate features have new style
        // get fill color
        // get stroke color on first shape point
        let colors = await getCanvasPixelColor(mapContainer, [{x: 380, y: 280}, {x: 247, y: 327}]);

        expect(colors[0]).to.equal('#9fe030');
        expect(colors[1]).to.equal('#906fff');
    });

    it('style feature with opacity, validate its new style', async () => {
        // set style for the added feature
        buildingLayer.setStyleGroup(
            feature, [
                // fill and opacity values makes sure alpha blending background and fill colors/background and stroke colors will produce integer color value
                {'zIndex': 0, 'type': 'Polygon', 'opacity': 0.6, 'fill': '#9be128', 'stroke': '#3750cd', 'strokeWidth': 15}
            ]);

        let colors = await getCanvasPixelColor(mapContainer, [{x: 380, y: 280}, {x: 315, y: 337}]);

        expect(colors[0]).to.equal('#c3ed7e');
        expect(colors[1]).to.equal('#8796e1');
    });

    it('style feature with opacity, validate its new style', async () => {
        // set style for the added feature
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'opacity': 0.6, 'fill': '#9be128', 'stroke': '#3750cd', 'strokeWidth': 15},
                {'zIndex': 1, 'type': 'Polygon', 'opacity': 1, 'fill': '#ff0000', 'stroke': '#906fff', 'strokeWidth': 15}
            ]);

        // validate features have new style
        // get fill color
        // get stroke color on first shape point
        let colors = await getCanvasPixelColor(mapContainer, [{x: 380, y: 280}, {x: 247, y: 327}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#906fff');
    });


    it('setViewBounds to new polygon geometry', async () => {
        buildingLayer.setFeatureCoordinates(feature, [[[[-74.013731421, 40.706585985], [-74.007503806, 40.706139625], [-74.014741571, 40.706437725], [-74.014601256, 40.705598175], [-74.013483023, 40.703395543], [-74.016736518, 40.703730812], [-74.01555255, 40.705150197], [-74.016208765, 40.706952215], [-74.013731421, 40.706585985]]]]);

        await waitForViewportReady(display, () => {
            display.setViewBounds(feature);
        });

        expect(display.getCenter()).to.deep.almost({longitude: -74.012120162, latitude: 40.705173879});
        expect(display.getZoomlevel()).to.equal(16);
    });


    it('set circle style', async () => {
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'fill': '#00ff00'},
                {'zIndex': 1, 'type': 'Circle', 'radius': 6, 'fill': '#ff0000'}
            ]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#ff0000');
    });

    it('set circle style with anchor: Center', async () => {
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'fill': '#00ff00'},
                {'zIndex': 1, 'type': 'Circle', 'radius': 6, 'fill': '#0000ff', 'anchor': 'Center'}
            ]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#0000ff');
    });

    it('set circle style with anchor: Centroid', async () => {
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'fill': '#00ff00'},
                {'zIndex': 1, 'type': 'Circle', 'radius': 6, 'fill': '#ff0000', 'anchor': 'Centroid'}
            ]);

        let color = await getCanvasPixelColor(mapContainer, {x: 276, y: 307});

        expect(color).to.equal('#ff0000');
    });

    it('set circle Rect', async () => {
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'fill': '#00ff00'},
                {'zIndex': 1, 'type': 'Rect', 'width': 12, 'fill': '#ff0000'}
            ]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#ff0000');
    });

    it('set rect style with anchor: Center', async () => {
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'fill': '#00ff00'},
                {'zIndex': 1, 'type': 'Rect', 'width': 12, 'fill': '#0000ff', 'anchor': 'Center'}
            ]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#0000ff');
    });

    it('set rect style with anchor: Centroid', async () => {
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'fill': '#00ff00'},
                {'zIndex': 1, 'type': 'Rect', 'width': 12, 'fill': '#ff0000', 'anchor': 'Centroid'}
            ]);

        let color = await getCanvasPixelColor(mapContainer, {x: 276, y: 307});

        expect(color).to.equal('#ff0000');
    });

    it('set icon style', async () => {
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'fill': '#00ff00'},
                {'zIndex': 1, 'type': 'Image', 'width': 12, 'src': IMG_SRC_RED}
            ]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#ff0000');
    });

    it('set icon style with anchor: Center', async () => {
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'fill': '#00ff00'},
                {'zIndex': 1, 'type': 'Image', 'width': 12, 'src': IMG_SRC_BLUE, 'anchor': 'Center'}
            ]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#0000ff');
    });

    it('set icon style with anchor: Centroid', async () => {
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'fill': '#00ff00'},
                {'zIndex': 1, 'type': 'Image', 'width': 12, 'src': IMG_SRC_RED, 'anchor': 'Centroid'}
            ]);

        let color = await getCanvasPixelColor(mapContainer, {x: 276, y: 307});

        expect(color).to.equal('#ff0000');
    });


    it('set text style', async () => {
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'fill': '#00ff00'},
                {zIndex: 1, type: 'Text', font: FONT, text: FULL_BLOCK_CHAR, width: 12, fill: '#ff0000'}

            ]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#ff0000');
    });

    it('set icon style with anchor: Center', async () => {
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'fill': '#00ff00'},
                {'zIndex': 1, 'type': 'Text', 'font': FONT, 'text': FULL_BLOCK_CHAR, 'width': 12, 'fill': '#0000ff', 'anchor': 'Center'}
            ]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        expect(color).to.equal('#0000ff');
    });

    it('set icon style with anchor: Centroid', async () => {
        buildingLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Polygon', 'fill': '#00ff00'},
                {'zIndex': 1, 'type': 'Text', 'font': FONT, 'text': FULL_BLOCK_CHAR, 'width': 12, 'fill': '#ff0000', 'anchor': 'Centroid'}
            ]);

        let color = await getCanvasPixelColor(mapContainer, {x: 276, y: 307});

        expect(color).to.equal('#ff0000');
    });
});
