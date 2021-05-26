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
import dataset from './zoom_in_20_plus.json';

describe('zoom in 20+', function() {
    const expect = chai.expect;

    let imageLayer;
    let localLayer;
    let display;
    let mapContainer;

    const MAX_ZOOM = 28;

    before(async () => {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 74.17248018921896, latitude: 15.47981601135929},
            zoomlevel: 22.7,
            layers: preparedData.getLayers(),
            maxLevel: MAX_ZOOM,
            behavior: {
                pitch: true,
                rotate: true
            }
        });
        await waitForViewportReady(display);

        mapContainer = display.getContainer();
        imageLayer = preparedData.getLayers('imageLayer');
        localLayer = preparedData.getLayers('localLayer');
    });

    after(async () => display.destroy());

    it('validate inital zoom', async () => {
        expect(display.getZoomlevel()).to.equal(22.7);
    });

    it('validate max zoom is set', async () => {
        let lock = display.lockViewport();
        expect(lock.maxLevel).to.equal(MAX_ZOOM);
    });

    it('validate point is displayed', async () => {
        let color = await getCanvasPixelColor(mapContainer, {x: 447, y: 79});
        expect(color).to.equal('#ff0000');
    });

    it('check if tiles are rendered', async () => {
        let colors = await getCanvasPixelColor(mapContainer, [
            // top left screen quad (red)
            {x: 200, y: 200},
            // top right screen quad (blue)
            {x: 500, y: 200},
            // bottom left screen quad (blue)
            {x: 200, y: 400},
            // bottom right screen quad (red)
            {x: 500, y: 400}
        ]);
        for (let color of colors) {
            expect(color).to.not.equal('#ffffff');
        }
    });

    it('pitch&rotate map and check if tiles are visible', async () => {
        display.pitch(40);
        display.rotate(45);
        let colors = await getCanvasPixelColor(mapContainer, [
            // top left screen quad
            {x: 200, y: 200},
            // top right screen quad
            {x: 500, y: 200},
            // bottom left screen quad
            {x: 200, y: 400},
            // bottom right screen quad
            {x: 500, y: 400}
        ]);

        for (let color of colors) {
            expect(color).to.not.equal('#ffffff');
        }
    });

    it('set max zooom', async () => {
        display.setZoomlevel(MAX_ZOOM);
        expect(display.getZoomlevel()).to.equal(MAX_ZOOM);
    });

    it('set invalid max zooom', async () => {
        display.setZoomlevel(MAX_ZOOM + 1);
        expect(display.getZoomlevel()).to.equal(MAX_ZOOM);
    });


    it('validate line in cm precision range', async () => {
        display.rotate(0);
        display.pitch(0);

        localLayer.addFeature({
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': [
                    [-77.0077689, 38.9011324],
                    [-77.0077689, 38.9011329],
                    [-77.0077688, 38.9011329]
                ]
            }
        }, {
            zIndex: 1,
            type: 'Line',
            stroke: '#0000ff',
            strokeWidth: 14
        });

        display.setCenter(-77.0077688, 38.9011329);

        const color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).to.equal('#0000ff');
    });
});
