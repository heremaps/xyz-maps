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

import {prepare} from 'utils';
import {waitForViewportReady} from 'displayUtils';
import {Map} from '@here/xyz-maps-display';
import dataset from './get_objects_spec.json';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('get objects', function() {
    let preparedData;
    let display;
    let link;

    let testLayer;

    beforeEach(async () => {
        preparedData = await prepare(dataset);


        testLayer = preparedData.getLayers('paLayer');

        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        await waitForViewportReady(display);

        link = preparedData.getFeature('linkLayer', 1003913693);
    });

    afterEach(async () => {
        display.destroy();
        await preparedData.clear();
    });

    it('validate getFeatureAt', () => {
        let o = display.getFeatureAt({x: 10, y: 10});
        expect(o).toBe(undefined);
    });


    it('validate getFeatureAt at a difference place', () => {
        let o = display.getFeatureAt({x: 298, y: 183});

        expect(o.feature).toEqual(expect.objectContaining({id: link.id}));
        expect(o.layer).toEqual(expect.objectContaining({name: 'Link Layer'}));
        expect(o.features).toHaveLength(1);
    });


    it('validate getFeatureAt at a difference place after moving map to another place', async () => {
        await waitForViewportReady(display, () => {
            display.setCenter({
                longitude: 76.75926261624988,
                latitude: 12.836190489456936
            });
        });

        let o = display.getFeatureAt({x: 411, y: 316});
        expect(o.layer).toEqual(expect.objectContaining({name: 'Address Layer'}));
        expect(o.features).toHaveLength(1);
    });

    it('updates picking order as Polygon, Point and Line zIndex and zLayer change', () => {
        testLayer.getProvider().clear();

        let p = display.pixelToGeo({x: 300, y: 300});

        testLayer.addFeature({
            id: 'Polygon',
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [p.longitude - 0.0001, p.latitude - 0.0001],
                    [p.longitude + 0.0001, p.latitude - 0.0001],
                    [p.longitude + 0.0001, p.latitude + 0.0001],
                    [p.longitude - 0.0001, p.latitude + 0.0001],
                    [p.longitude - 0.0001, p.latitude - 0.0001]
                ]]
            }
        }, [{
            type: 'Polygon',
            zIndex: 2,
            fill: 'black',
            opacity: .5
        }]);

        testLayer.addFeature({
            id: 'Line',
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [p.longitude - 0.0002, p.latitude],
                    [p.longitude + 0.0002, p.latitude]
                ]
            }
        }, [{
            type: 'Line',
            zIndex: 1,
            stroke: 'green',
            strokeWidth: 16
        }]);

        testLayer.addFeature({
            id: 'Point',
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [p.longitude, p.latitude]
            }, properties: {}
        }, [{
            type: 'Circle',
            zIndex: 0,
            fill: 'blue',
            radius: 20
        }]);

        let o = display.getFeatureAt({x: 300, y: 300});

        expect(o.feature).toEqual(expect.objectContaining({id: 'Polygon'}));
        // move point to top
        testLayer.setStyleGroup(testLayer.search('Point'), [{
            type: 'Circle',
            zIndex: 3,
            fill: 'blue',
            radius: 20
        }]);

        o = display.getFeatureAt({x: 300, y: 300});

        expect(o.feature).toEqual(expect.objectContaining({id: 'Point'}));
        // move line to top
        testLayer.setStyleGroup(testLayer.search('Line'), [{
            type: 'Line',
            zIndex: 4,
            stroke: 'green',
            strokeWidth: 16
        }]);

        o = display.getFeatureAt({x: 300, y: 300});

        expect(o.feature).toEqual(expect.objectContaining({id: 'Line'}));
        // move polygon to top
        testLayer.setStyleGroup(testLayer.search('Polygon'), [{
            type: 'Polygon',
            zIndex: 2,
            zLayer: 10,
            fill: 'black',
            opacity: .5
        }]);

        o = display.getFeatureAt({x: 300, y: 300});

        expect(o.feature).toEqual(expect.objectContaining({id: 'Polygon'}));
        // move point to top
        testLayer.setStyleGroup(testLayer.search('Point'), [{
            type: 'Circle',
            zIndex: 1,
            fill: 'blue',
            zLayer: 11,
            radius: 20
        }]);

        o = display.getFeatureAt({x: 300, y: 300});

        expect(o.feature).toEqual(expect.objectContaining({id: 'Point'}));
        // move line to top
        testLayer.setStyleGroup(testLayer.search('Line'), [{
            type: 'Line',
            zIndex: 0,
            zLayer: 12,
            stroke: 'green',
            strokeWidth: 16
        }]);

        o = display.getFeatureAt({x: 300, y: 300});

        expect(o.feature).toEqual(expect.objectContaining({id: 'Line'}));
    });
});
