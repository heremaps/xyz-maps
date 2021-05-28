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
import {getCanvasPixelColor} from 'utils';
import {TileLayer, LocalProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

describe('StyleGroup Rect and Line geometry', () => {
    const expect = chai.expect;
    let px1 = {x: 300, y: 500};
    let px2 = {x: 500, y: 100};
    let px3 = {x: 300, y: 100};
    let px4 = {x: 500, y: 500};
    let display;
    let mapContainer;
    let line1;
    let line2;
    let layer;
    let geo1;
    let geo2;

    before(async () => {
        layer = new TileLayer({
            min: 2,
            max: 20,
            provider: new LocalProvider()
        });

        display = new Map(document.getElementById('map'), {
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {
                longitude: 73.549401,
                latitude: 19.815739
            },
            zoomlevel: 18,
            layers: [layer]
        });

        geo1 = display.pixelToGeo(px1);
        geo2 = display.pixelToGeo(px2);


        line1 = layer.addFeature({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [geo1.longitude, geo1.latitude],
                    [geo2.longitude, geo2.latitude]
                ]
            }
        });

        line2 = layer.addFeature({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [geo1.longitude, geo1.latitude],
                    [geo1.longitude, geo2.latitude],
                    [geo2.longitude, geo1.latitude],
                    [geo2.longitude, geo2.latitude]

                ]
            }
        }, []);


        await waitForViewportReady(display);

        mapContainer = display.getContainer();
    });

    after(async () => {
        display.destroy();
    });

    it('style rect and validate', async () => {
        layer.setStyleGroup(line1, [{
            'zIndex': 1, 'type': 'Rect', 'width': 28, 'opacity': 1, 'fill': '#0000ff'
        }]);

        const colors = await getCanvasPixelColor(mapContainer, [px1, px2]);

        expect(colors[0]).to.equal('#0000ff');
        expect(colors[1]).to.equal('#0000ff');
    });

    it('set anchor to Line', async () => {
        layer.setStyleGroup(line1, [{
            'zIndex': 1, 'type': 'Rect', 'width': 28, 'opacity': 1, 'fill': '#0000ff', 'anchor': 'Line'
        }]);

        const colors = await getCanvasPixelColor(mapContainer, [px1, px2, {x: 400, y: 300}]);

        expect(colors[0]).to.equal('#ffffff');
        expect(colors[1]).to.equal('#ffffff');
        expect(colors[2]).to.equal('#0000ff');
    });

    it('stlye line 2', async () => {
        layer.setStyleGroup(line2, [{
            'zIndex': 1, 'type': 'Rect', 'width': 28, 'opacity': 1, 'fill': '#00ff00'
        }]);

        const colors = await getCanvasPixelColor(mapContainer, [px1, px2, px3, px4]);
        for (let color of colors) {
            expect(color).to.equal('#00ff00');
        }
    });

    it('set anchor2 to Line', async () => {
        layer.setStyleGroup(line2, [{
            'zIndex': 2, 'type': 'Rect', 'width': 12, 'opacity': 1, 'fill': '#00ff00', 'anchor': 'Line'
        }]);

        const colors = await getCanvasPixelColor(mapContainer, [{x: 300, y: 300}, {x: 400, y: 300}, {x: 500, y: 300}]);
        for (let color of colors) {
            expect(color).to.equal('#00ff00');
        }
    });


    it('enable collision detection', async () => {
        layer.setStyleGroup(line2, [{
            'zIndex': 2,
            'type': 'Rect',
            'width': 12,
            'opacity': 1,
            'fill': '#00ff00',
            'anchor': 'Line',
            'collide': false,
            'repeat': 0
        }]);
        layer.setStyleGroup(line1, [{
            zIndex: 1, type: 'Rect', width: 28, fill: '#0000ff', anchor: 'Line', collide: false, repeat: 0
        }]);

        const colors = await getCanvasPixelColor(mapContainer, [{x: 300, y: 300}, {x: 400, y: 300}, {x: 500, y: 300}]);

        expect(colors[0]).to.equal('#00ff00');
        expect(colors[1]).to.equal('#0000ff');
        expect(colors[2]).to.equal('#00ff00');
    });

    it('change priority', async () => {
        layer.setStyleGroup(line2, [{
            'zIndex': 2,
            'type': 'Rect',
            'width': 12,
            'opacity': 1,
            'fill': '#00ff00',
            'anchor': 'Line',
            'collide': false,
            'priority': 1,
            'repeat': 0
        }]);
        layer.setStyleGroup(line1, [{
            zIndex: 1, type: 'Rect', width: 28, fill: '#0000ff', anchor: 'Line', collide: false, repeat: 0
        }]);

        const colors = await getCanvasPixelColor(mapContainer, [{x: 300, y: 300}, {x: 400, y: 300}, {x: 500, y: 300}]);

        expect(colors[0]).to.equal('#00ff00');
        expect(colors[1]).to.equal('#00ff00');
        expect(colors[2]).to.equal('#00ff00');
    });

    it('set anchor2 to Coordinates', async () => {
        layer.setStyleGroup(line2, [{
            'zIndex': 2,
            'type': 'Rect',
            'width': 12,
            'opacity': 1,
            'fill': '#00ff00',
            'anchor': 'Coordinate',
            'collide': false,
            'priority': 1
        }]);
        layer.setStyleGroup(line1, [{
            zIndex: 1, type: 'Rect', width: 28, fill: '#0000ff', anchor: 'Line', collide: false
        }]);

        const colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, px1, px2, px3, px4]);

        expect(colors[0]).to.equal('#0000ff');
        expect(colors[1]).to.equal('#00ff00');
        expect(colors[2]).to.equal('#00ff00');
        expect(colors[3]).to.equal('#00ff00');
        expect(colors[4]).to.equal('#00ff00');
    });

    it('set anchor1 to Coordinates', async () => {
        layer.setStyleGroup(line2, [{
            'zIndex': 2,
            'type': 'Rect',
            'width': 12,
            'opacity': 1,
            'fill': '#00ff00',
            'anchor': 'Coordinate',
            'collide': false,
            'priority': 1
        }]);
        layer.setStyleGroup(line1, [{
            zIndex: 1, type: 'Circle', width: 14, fill: '#0000ff', anchor: 'Coordinate', collide: false
        }]);

        const colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, px1, px2, px3, px4]);

        expect(colors[0]).to.equal('#ffffff');
        expect(colors[1]).to.equal('#00ff00');
        expect(colors[2]).to.equal('#00ff00');
        expect(colors[3]).to.equal('#00ff00');
        expect(colors[4]).to.equal('#00ff00');
    });

    it('change prio1', async () => {
        layer.setStyleGroup(line2, [{
            'zIndex': 2,
            'type': 'Rect',
            'width': 12,
            'opacity': 1,
            'fill': '#00ff00',
            'anchor': 'Coordinate',
            'collide': false
        }]);
        layer.setStyleGroup(line1, [{
            zIndex: 1,
            type: 'Rect',
            width: 28,

            fill: '#0000ff',
            anchor: 'Coordinate',
            collide: false,
            priority: 1
        }]);

        const colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, px1, px2, px3, px4]);

        expect(colors[0]).to.equal('#ffffff');
        expect(colors[1]).to.equal('#0000ff');
        expect(colors[2]).to.equal('#0000ff');
        expect(colors[3]).to.equal('#00ff00');
        expect(colors[4]).to.equal('#00ff00');
    });

    it('check collision-groups', async () => {
        layer.setStyleGroup(line2, [{
            'zIndex': 1,
            'type': 'Rect',
            'width': 20,
            'opacity': 1,
            'fill': '#00ff00',
            'anchor': 'Coordinate',
            'collide': false
        }, {
            'zIndex': 2,
            'type': 'Rect',
            'width': 12,
            'opacity': 1,
            'fill': '#ff0000',
            'anchor': 'Coordinate',
            'collide': false
        }]);
        layer.setStyleGroup(line1, [{
            zIndex: 0,
            type: 'Rect',
            width: 28,

            fill: '#0000ff',
            anchor: 'Coordinate',
            collide: false,
            priority: 1
        }, {
            zIndex: 1,
            type: 'Rect',
            width: 20,

            fill: '#ff0000',
            anchor: 'Coordinate',
            collide: false,
            priority: 1
        }]);

        const colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, px1, px2, px3, px4]);

        expect(colors[0]).to.equal('#ffffff');
        expect(colors[1]).to.equal('#ff0000');
        expect(colors[2]).to.equal('#ff0000');
        expect(colors[3]).to.equal('#ff0000');
        expect(colors[4]).to.equal('#ff0000');
    });

    it('check partial collision-groups', async () => {
        layer.setStyleGroup(line2, [{
            'zIndex': 1,
            'type': 'Rect',
            'width': 20,
            'opacity': 1,
            'fill': '#00ff00',
            'anchor': 'Coordinate',
            'collide': false
        }, {
            'zIndex': 2,
            'type': 'Rect',
            'width': 12,
            'opacity': 1,
            'fill': '#ff0000',
            'anchor': 'Coordinate',
            'collide': false
        }]);
        layer.setStyleGroup(line1, [{
            zIndex: 0,
            type: 'Rect',
            width: 28,

            fill: '#0000ff',
            anchor: 'Coordinate',
            collide: false,
            priority: 1
        }, {
            zIndex: 9,
            type: 'Rect',
            width: 20,

            fill: '#ff00ff',
            anchor: 'Coordinate',
            collide: true,
            priority: 1
        }]);

        const colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}, px1, px2, px3, px4]);

        expect(colors[0]).to.equal('#ffffff');
        expect(colors[1]).to.equal('#ff00ff');
        expect(colors[2]).to.equal('#ff00ff');
        expect(colors[3]).to.equal('#ff0000');
        expect(colors[4]).to.equal('#ff0000');
    });

    it('set minimum repeat distance - anchor Line', async () => {
        layer.setStyleGroup(line2, [{
            zIndex: 1,
            type: 'Rect',
            width: 20,
            opacity: 1,
            fill: '#00ff00',
            anchor: 'Line',
            collide: false,
            repeat: 256
        }]);

        const colors = await getCanvasPixelColor(mapContainer, [{x: 300, y: 300}, {x: 400, y: 300}, {x: 500, y: 300}]);

        expect(colors[0]).to.equal('#ffffff');
        expect(colors[1]).to.equal('#00ff00');
        expect(colors[2]).to.equal('#ffffff');
    });

    it('set minimum repeat distance - anchor Coordinate', async () => {
        layer.setStyleGroup(line1, null);

        layer.setStyleGroup(line2, [{
            zIndex: 1,
            type: 'Rect',
            width: 20,
            opacity: 1,
            fill: '#00ff00',
            anchor: 'Coordinate',
            collide: false,
            repeat: 256
        }]);

        const colors = await getCanvasPixelColor(mapContainer, [
            {x: 300, y: 500}, {x: 300, y: 100}, {x: 500, y: 100}, {x: 500, y: 500}
        ]);

        expect(colors[0]).to.equal('#00ff00');
        expect(colors[1]).to.equal('#00ff00');
        expect(colors[2]).to.equal('#ffffff');
        expect(colors[3]).to.equal('#ffffff');
    });
});
