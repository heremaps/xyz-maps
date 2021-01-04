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
import dataset from './display_map_and_link_layer.json';

describe('display image and link layers', function() {
    const expect = chai.expect;

    let imageLayer;
    let linkLayer;
    let display;
    let mapContainer;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 75.17035879069607, latitude: 15.482777312100069},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        await waitForViewportReady(display);

        mapContainer = display.getContainer();
        imageLayer = preparedData.getLayers('imageLayer');
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        display.destroy();
    });

    it('validate sat image link', async function() {
        expect(display.getLayers()).to.lengthOf(2);

        // validate map tile is displayed
        let color = await getCanvasPixelColor(mapContainer, {x: 700, y: 150});
        expect(color).to.not.equal('#ffffff');
        expect(color).to.not.equal('#ff0000');

        // validate link is displayed
        color = await getCanvasPixelColor(mapContainer, {x: 700, y: 110});
        expect(color).to.equal('#ff0000');
    });
});
