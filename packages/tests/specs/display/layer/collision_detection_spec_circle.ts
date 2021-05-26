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
import dataset from './collision_detection_spec.json';

describe('collision detection - Circle', function() {
    const expect = chai.expect;

    const color1 = '#ff0000';
    const color2 = '#0000ff';

    let x1 = 300;
    let y1 = 300;
    let x2 = x1 + 24;
    let y2 = y1 + 24;
    let geo1;
    let geo2;
    let testLayer;
    let display;
    let mapContainer;
    let feature1;
    let feature2;

    before(async () => {
        let data = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {
                longitude: 73.473,
                latitude: 21.405
            },
            zoomlevel: 18,
            layers: data.getLayers()
        });
        await waitForViewportReady(display);

        mapContainer = display.getContainer();
        testLayer = data.getLayers('testLayer');

        geo1 = display.pixelToGeo(x1, y1);
        geo2 = display.pixelToGeo(x2, y2);
    });

    after(async () => {
        display.destroy();
    });

    it('create features close to tile boundary and make sure its visible', async function() {
        feature1 = testLayer.addFeature({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [73.47146955841399, 21.404434999821802]
            }
        }, [{
            zIndex: 0,
            type: 'Circle',
            fill: color1,
            radius: 20,
            collide: false,
            priority: 1
        }]);

        let color = await getCanvasPixelColor(mapContainer,
            display.geoToPixel(73.47146955841399, 21.404434999821802)
        );

        expect(color).to.equal(color1);
    });

    it('create feature in center of tile', async () => {
        testLayer.getProvider().clear();

        feature1 = testLayer.addFeature({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [geo1.longitude, geo1.latitude]
            }
        }, [{
            zIndex: 1,
            type: 'Circle',
            fill: color1,
            // width: 35,
            // height: 48,
            radius: 20,
            collide: false,
            priority: 1
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: x1, y: y1});

        expect(color).to.equal(color1);
    });


    it('add another feature and validate its invisible due to collision', async () => {
        feature2 = testLayer.addFeature({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [geo2.longitude, geo2.latitude]
            }
        }, [{
            zIndex: 10,
            type: 'Circle',
            fill: color2,
            // width: 35,
            // height: 48,
            radius: 20,
            collide: false,
            priority: 2
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: x2, y: y2});

        expect(color).to.equal('#ffffff');
    });

    it('disable collision detection', async () => {
        let style1 = testLayer.getStyleGroup(feature1);
        style1[0].collide = true;
        testLayer.setStyleGroup(feature1, style1);

        let style2 = testLayer.getStyleGroup(feature2);
        style2[0].collide = true;
        testLayer.setStyleGroup(feature2, style2);

        let colors = await getCanvasPixelColor(mapContainer, [{x: x1, y: y1}, {x: x2, y: y2}]);

        expect(colors[0]).to.equal(color1);
        expect(colors[1]).to.equal(color2);
    });

    it('reenable collision detection', async () => {
        let style1 = testLayer.getStyleGroup(feature1);
        style1[0].collide = false;
        testLayer.setStyleGroup(feature1, style1);

        let style2 = testLayer.getStyleGroup(feature2);
        style2[0].collide = false;
        testLayer.setStyleGroup(feature2, style2);

        let colors = await getCanvasPixelColor(mapContainer, [{x: x1, y: y1}, {x: x2, y: y2}]);

        expect(colors[0]).to.equal(color1);
        expect(colors[1]).to.equal('#ffffff');
    });

    it('flip collision priorities', async () => {
        let style1 = testLayer.getStyleGroup(feature1);
        style1[0].priority = 2;
        testLayer.setStyleGroup(feature1, style1);

        let style2 = testLayer.getStyleGroup(feature2);
        style2[0].priority = 1;
        testLayer.setStyleGroup(feature2, style2);

        let colors = await getCanvasPixelColor(mapContainer, [{x: x1, y: y1}, {x: x2, y: y2}]);

        expect(colors[0]).to.equal('#ffffff');
        expect(colors[1]).to.equal(color2);
    });

    it('move feature and make sure it becomes visible again', async () => {
        display.debug(1);
        let {longitude, latitude} = display.pixelToGeo(x1 + 100, y1);

        testLayer.setFeatureCoordinates(feature1, [longitude, latitude]);

        let color = await getCanvasPixelColor(mapContainer, {x: x1 + 100, y: y1}, {
            retry: 5,
            retryDelay: 50,
            expect: color1
        });

        expect(color).to.equal(color1);
        display.debug(0);
    });


    it('flip priorities and move back', async () => {
        let style1 = testLayer.getStyleGroup(feature1);
        style1[0].priority = 1;
        testLayer.setStyleGroup(feature1, style1);

        let style2 = testLayer.getStyleGroup(feature2);
        style2[0].priority = 2;
        testLayer.setStyleGroup(feature2, style2);

        let {longitude, latitude} = display.pixelToGeo(x1, y1);

        testLayer.setFeatureCoordinates(feature1, [longitude, latitude]);

        let color = await getCanvasPixelColor(mapContainer, {x: x1, y: y1}, {
            retry: 5,
            retryDelay: 50,
            expect: color1
        });

        expect(color).to.equal(color1);
    });
});
