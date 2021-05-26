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
import dataset from './drawing_order_zLayer_spec.json';

describe('feature drawing order', () => {
    const expect = chai.expect;

    let layer1;
    let layer2;
    let feature1;
    let feature2;
    let feature3;
    let display;
    let mapContainer;


    before(async () => {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: -122.254528, latitude: 37.796249},
            zoomlevel: 17,
            layers: preparedData.getLayers()
        });

        display.setBackgroundColor('yellow');

        await waitForViewportReady(display);
        mapContainer = display.getContainer();
        layer1 = preparedData.getLayers('layer1');
        layer2 = preparedData.getLayers('layer2');


        feature1 = preparedData.getFeature('layer1', 'layer1-f1');
        feature2 = preparedData.getFeature('layer1', 'layer1-f2');
        feature3 = preparedData.getFeature('layer2', 'layer2-f1');
    });

    after(async () => {
        display.destroy();
    });

    it('apply styles and validate drawing order', async () => {
        layer1.setStyleGroup(feature1, [{
            zIndex: 0,
            type: 'Circle',
            radius: 32,
            fill: '#ff0000'
        }]);

        layer1.setStyleGroup(feature2, [{
            zIndex: 5,
            type: 'Circle',
            radius: 32,
            fill: '#00ff00'
        }]);

        layer2.setStyleGroup(feature3, [{
            // zLayer: 1,
            zIndex: 3,
            type: 'Circle',
            radius: 32,
            fill: '#0000ff'
        }]);

        let colors = await getCanvasPixelColor(mapContainer, [{x: 413, y: 290}, {x: 409, y: 308}, {x: 390, y: 305}]);

        expect(colors[0]).to.equal('#0000ff');
        expect(colors[1]).to.equal('#00ff00');
        expect(colors[2]).to.equal('#ff0000');
    });

    it('change zIndex of red circle to be in the middle', async () => {
        layer1.setStyleGroup(feature1, [{
            zIndex: 8,
            type: 'Circle',
            radius: 32,
            fill: '#ff0000'
        }]);

        let colors = await getCanvasPixelColor(mapContainer, [{x: 413, y: 290}, {x: 421, y: 310}, {x: 440, y: 298}]);

        expect(colors[0]).to.equal('#0000ff');
        expect(colors[1]).to.equal('#ff0000');
        expect(colors[2]).to.equal('#00ff00');
    });

    it('change zLayer to be blue circle to be in the middle', async () => {
        layer2.setStyleGroup(feature3, [{
            zLayer: 1,
            zIndex: 6,
            type: 'Circle',
            radius: 32,
            fill: '#0000ff'
        }]);

        let colors = await getCanvasPixelColor(mapContainer, [{x: 413, y: 280}, {x: 435, y: 281}, {x: 440, y: 300}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#0000ff');
        expect(colors[2]).to.equal('#00ff00');
    });

    it('change zLayer to bring blue circle to back', async () => {
        layer2.setStyleGroup(feature3, [{
            zLayer: 0,
            zIndex: 6,
            type: 'Circle',
            radius: 32,
            fill: '#0000ff'
        }]);

        let colors = await getCanvasPixelColor(mapContainer, [{x: 413, y: 280}, {x: 435, y: 281}, {x: 415, y: 258}]);

        expect(colors[0]).to.equal('#ff0000');
        expect(colors[1]).to.equal('#00ff00');
        expect(colors[2]).to.equal('#0000ff');
    });

    it('all circles in same zLayer', async () => {
        layer1.setStyleGroup(feature1, [{
            zLayer: 123,
            zIndex: 1,
            type: 'Circle',
            radius: 32,
            fill: '#ff0000'
        }]);

        layer1.setStyleGroup(feature2, [{
            zLayer: 123,
            zIndex: 3,
            type: 'Circle',
            radius: 32,
            fill: '#00ff00'
        }]);

        layer2.setStyleGroup(feature3, [{
            zLayer: 123,
            zIndex: 2,
            type: 'Circle',
            radius: 32,
            fill: '#0000ff'
        }]);

        let colors = await getCanvasPixelColor(mapContainer, [{x: 396, y: 280}, {x: 405, y: 308}, {x: 394, y: 306}]);

        expect(colors[0]).to.equal('#0000ff');
        expect(colors[1]).to.equal('#00ff00');
        expect(colors[2]).to.equal('#ff0000');
    });

    it('remove zLayer', async () => {
        layer1.setStyleGroup(feature1, [{
            zIndex: 1,
            type: 'Circle',
            radius: 32,
            fill: '#ff0000'
        }]);

        layer1.setStyleGroup(feature2, [{
            zIndex: 3,
            type: 'Circle',
            radius: 32,
            fill: '#00ff00'
        }]);

        layer2.setStyleGroup(feature3, [{
            zIndex: 2,
            type: 'Circle',
            radius: 32,
            fill: '#0000ff'
        }]);

        let colors = await getCanvasPixelColor(mapContainer, [{x: 420, y: 282}, {x: 414, y: 310}, {x: 396, y: 320}]);

        expect(colors[0]).to.equal('#0000ff');
        expect(colors[1]).to.equal('#00ff00');
        expect(colors[2]).to.equal('#ff0000');
    });

    it('set zLayer to bring red circle to front', async () => {
        layer1.setStyleGroup(feature1, [{
            zLayer: 100,
            zIndex: 1,
            type: 'Circle',
            radius: 32,
            fill: '#ff0000'
        }]);


        let color = await getCanvasPixelColor(mapContainer, {x: 405, y: 282});

        expect(color).to.equal('#ff0000');
    });
});
