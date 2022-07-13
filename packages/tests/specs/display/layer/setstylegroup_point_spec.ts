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
import dataset from './setstylegroup_point_spec.json';

describe('setStyleGroup Point', function() {
    const expect = chai.expect;

    let paLayer;
    let display;
    let mapContainer;
    let feature1;
    let feature2;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.138138, latitude: 20.187398},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });

        await waitForViewportReady(display);

        mapContainer = display.getContainer();
        paLayer = preparedData.getLayers('paLayer');

        // get features
        feature1 = preparedData.getFeature('paLayer', '123');
        feature2 = preparedData.getFeature('paLayer', '124');
    });

    after(async function() {
        display.destroy();
    });

    it('style feature, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature1,
            {'zIndex': 0, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 16}
        );

        paLayer.setStyleGroup(
            feature2,
            {'zIndex': 0, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 16}
        );

        // validate features have new style
        // get color of address 1
        // get color of address 2
        let colors1 = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 217, y: 300}]);

        expect(colors1[0]).to.equal('#be6b65');
        expect(colors1[1]).to.equal('#be6b65');

        // reset style
        paLayer.setStyleGroup(
            feature1
        );

        paLayer.setStyleGroup(
            feature2
        );

        // validate features have style reset
        // get color of address 1 again
        // get color of address 2 again
        let colors2 = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 217, y: 300}]);

        expect(colors2[0]).to.equal('#ff0000');
        expect(colors2[1]).to.equal('#ff0000');
    });

    it('style feature with different zIndex, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature1, [
                {'zIndex': 0, 'type': 'Rect', 'width': 8, 'height': 16, 'opacity': 1, 'fill': '#be6b65'},
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 8, 'opacity': 1, 'fill': '#ffffff'}
            ]);

        // validate features have new style
        // get color in middle of address 1
        // get color in mid bottom of address 1
        // get color in mid right of address 1
        let colors1 = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 400, y: 305}, {x: 405, y: 300}]);

        expect(colors1[0]).to.equal('#ffffff');
        expect(colors1[1]).to.equal('#be6b65');
        expect(colors1[2]).to.equal('#ffffff');


        // set style for the added feature
        paLayer.setStyleGroup(
            feature1, [
                {'zIndex': 1, 'type': 'Rect', 'width': 8, 'height': 16, 'opacity': 1, 'fill': '#be6b65'},
                {'zIndex': 0, 'type': 'Rect', 'width': 16, 'height': 8, 'opacity': 1, 'fill': '#ffffff'}
            ]);

        // validate features have new style
        // get color in middle of address 1
        // get color in mid bottom of address 1
        // get color in mid right of address 1
        let colors2 = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, {x: 400, y: 305}, {x: 405, y: 300}]);

        expect(colors2[0]).to.equal('#be6b65');
        expect(colors2[1]).to.equal('#be6b65');
        expect(colors2[2]).to.equal('#ffffff');
    });
});
