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

import {prepare} from 'utils';
import {waitForViewportReady} from 'displayUtils';
import {Map} from '@here/xyz-maps-display';
import dataset from './get_objects_spec.json';

describe('get objects', function() {
    const expect = chai.expect;

    let preparedData;
    let display;
    let link;

    let testLayer;

    before(async () => {
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

    after(async () => {
        display.destroy();
        await preparedData.clear();
    });

    it('validate getFeatureAt', () => {
        let o = display.getFeatureAt({x: 10, y: 10});
        expect(o).to.equal(undefined);
    });


    it('validate getFeatureAt at a difference place', () => {
        let o = display.getFeatureAt({x: 298, y: 183});

        expect(o.feature).to.deep.include({id: link.id});
        expect(o.layer).to.deep.include({name: 'Link Layer'});
        expect(o.features).to.have.lengthOf(1);
    });


    it('validate getFeatureAt at a difference place after moving map to another place', async () => {
        await waitForViewportReady(display, () => {
            display.setCenter({
                longitude: 76.75926261624988,
                latitude: 12.836190489456936
            });
        });

        let o = display.getFeatureAt({x: 411, y: 316});
        expect(o.layer).to.deep.include({name: 'Address Layer'});
        expect(o.features).to.have.lengthOf(1);
    });

    it('validate drawing order Polygon', () => {
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

        expect(o.feature).to.deep.include({id: 'Polygon'});
    });

    it('validate drawing order Point', () => {
        // move point to top
        testLayer.setStyleGroup(testLayer.search('Point'), [{
            type: 'Circle',
            zIndex: 3,
            fill: 'blue',
            radius: 20
        }]);

        let o = display.getFeatureAt({x: 300, y: 300});

        expect(o.feature).to.deep.include({id: 'Point'});
    });

    it('validate drawing order Line', () => {
        // move line to top
        testLayer.setStyleGroup(testLayer.search('Line'), [{
            type: 'Line',
            zIndex: 4,
            stroke: 'green',
            strokeWidth: 16
        }]);

        let o = display.getFeatureAt({x: 300, y: 300});

        expect(o.feature).to.deep.include({id: 'Line'});
    });
});
