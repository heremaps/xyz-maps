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

import {displayTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import dataset from './add_remove_layer_spec.json';

describe('get add and remove map layer', function() {
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
            center: {longitude: 74.17035879069607, latitude: 15.482777312100069},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        await displayTests.waitForViewportReady(display);

        mapContainer = display.getContainer();
        imageLayer = preparedData.getLayers('imageLayer');
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        display.destroy();
    });

    it('validate sat image added and validate sat image', async function() {
        expect(display.getLayers()).to.lengthOf(2);

        // validate no tile is displayed
        let color = testUtils.getCanvasPixelColor(mapContainer, 70, 119);
        expect(color).to.not.equal('#ffffff');
    });

    it('remove image overlay and validate ground', async function() {
        expect(display.getLayers()).to.lengthOf(2);


        await displayTests.waitForViewportReady(display, [linkLayer], ()=>{
            display.removeLayer(imageLayer);
        });

        expect(display.getLayers()).to.lengthOf(1);

        let color = testUtils.getCanvasPixelColor(mapContainer, 70, 119);
        expect(color).to.equal('#ffffff');
    });

    it('add image overlay and validate sat image', async function() {
        expect(display.getLayers()).to.lengthOf(1);

        await displayTests.waitForViewportReady(display, [imageLayer, linkLayer], ()=>{
            display.addLayer(imageLayer, 0);
        });

        expect(display.getLayers()).to.lengthOf(2);

        // validate no tile is displayed
        let color = testUtils.getCanvasPixelColor(mapContainer, 70, 119);
        expect(color).to.not.equal('#ffffff');
    });
});
