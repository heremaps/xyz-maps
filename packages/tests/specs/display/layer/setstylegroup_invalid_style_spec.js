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
import dataset from './setstylegroup_invalid_style_spec.json';


describe('setStyleGroup with invalid style', function() {
    const expect = chai.expect;

    let linkLayer;
    let addressLayer;
    let display;
    let mapContainer;
    let link;
    let address;

    before(async function() {
        let preparedData = await prepare(dataset);

        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 78.06609, latitude: 17.459677},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        await waitForViewportReady(display);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');
        addressLayer = preparedData.getLayers('paLayer');

        link = preparedData.getFeature('linkLayer', '123');
        address = preparedData.getFeature('paLayer', '123');
    });

    after(async function() {
        display.destroy();
    });

    it('style link, validate its new style with invalid value', async function() {
        // set link with invalid style
        linkLayer.setStyleGroup(
            link,
            [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 16},
                'invalid'
            ]
        );

        let style = linkLayer.getStyleGroup(link);

        expect(style).to.be.deep.equal([
            {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 16},
            'invalid'
        ]);

        // validate new link style
        let color1 = await getCanvasPixelColor(mapContainer, {x: 350, y: 300}); // get link color
        expect(color1).to.equal('#be6b65');

        // set link style again
        linkLayer.setStyleGroup(
            link,
            [
                {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 16},
                {'zIndex': 2, 'type': 'invalid', 'opacity': 1, 'stroke': '2e3b35', 'strokeWidth': 'invalid'}
            ]
        );

        style = linkLayer.getStyleGroup(link);

        expect(style).to.be.deep.equal([
            {'zIndex': 0, 'type': 'Line', 'opacity': 1, 'stroke': '#be6b65', 'strokeWidth': 16},
            {'zIndex': 2, 'type': 'invalid', 'opacity': 1, 'stroke': '2e3b35', 'strokeWidth': 'invalid'}
        ]);

        // validate link style
        let color2 = await getCanvasPixelColor(mapContainer, {x: 350, y: 300}); // get link color
        expect(color2).to.equal('#be6b65');
    });


    it('style address, validate its new style with invalid value', async function() {
        // set address with invalid style
        addressLayer.setStyleGroup(
            address,
            [
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'fill': '#765432'},
                'invalid'
            ]
        );

        let style = addressLayer.getStyleGroup(address);

        expect(style).to.be.deep.equal([
            {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'fill': '#765432'},
            'invalid'
        ]);

        // validate new address style
        let color1 = await getCanvasPixelColor(mapContainer, {x: 300, y: 200}); // get address color
        expect(color1).to.equal('#765432');

        // set address style again
        addressLayer.setStyleGroup(
            address,
            [
                {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'fill': '#765432'},
                {'zIndex': 2, 'type': 'invalid', 'opacity': 1, 'stroke': '2e3b35', 'strokeWidth': 'invalid'}
            ]
        );

        style = addressLayer.getStyleGroup(address);

        expect(style).to.be.deep.equal([
            {'zIndex': 1, 'type': 'Rect', 'width': 16, 'height': 16, 'opacity': 1, 'fill': '#765432'},
            {'zIndex': 2, 'type': 'invalid', 'opacity': 1, 'stroke': '2e3b35', 'strokeWidth': 'invalid'}
        ]);

        // validate address style
        let color2 = await getCanvasPixelColor(mapContainer, {x: 300, y: 200}); // get address color
        expect(color2).to.equal('#765432');
    });
});
