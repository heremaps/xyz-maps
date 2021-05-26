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

import {prepare} from 'utils';
import dataset from './add_remove_multiple_feature_spec.json';

describe('add and remove multiple features in layer', function() {
    const expect = chai.expect;

    var layer;

    before(async () => {
        let preparedData = await prepare(dataset);
        layer = preparedData.getLayers('addressLayer');
    });


    it('search features', async () => {
        let objs = layer.search({
            rect: {
                minLon: 76.6156351977292,
                minLat: 16.398663218659152,
                maxLon: 76.61992673215303,
                maxLat: 16.400809170779567
            }
        });

        expect(objs).to.have.lengthOf(0);
    });

    it('add an empty FeatureCollection', async () => {
        let result = layer.addFeature({
            type: 'FeatureCollection',
            features: []
        });
        expect(result).to.have.lengthOf(0);
    });

    it('add invalid FeatureCollection', async () => {
        let result = layer.addFeature({
            type: 'FeatureCollection'
        });
        expect(result).to.have.lengthOf(0);
    });

    it('add an empty feature array', async () => {
        let result = layer.addFeature([]);
        expect(result).to.have.lengthOf(0);
    });

    it('add 2 address feature', async () => {
        layer.addFeature([{
            geometry: {
                coordinates: [76.61612872418794, 16.399283334351907, 0],
                type: 'Point'
            },
            type: 'Feature',
            properties: {
                routingLink: '1',
                routingPoint: [76.61612872418794, 16.399283334351907, 0]
            }
        }, {
            geometry: {
                coordinates: [76.61612872418794, 16.399283334351907, 0],
                type: 'Point'
            },
            type: 'Feature',
            properties: {
                routingLink: '1',
                routingPoint: [76.61612872418794, 16.399283334351907, 0]
            }
        }],
        [{zIndex: 0, type: 'Circle', radius: 8, fill: '#F000F0'}]);
    });


    it('search features', async () => {
        let objs = layer.search({
            rect: {
                minLon: 76.6156351977292,
                minLat: 16.398663218659152,
                maxLon: 76.61992673215303,
                maxLat: 16.400809170779567
            }
        });

        expect(objs).to.have.lengthOf(2);
    });

    it('remove features', async () => {
        let rect = {
            minLon: 76.6156351977292,
            minLat: 16.398663218659152,
            maxLon: 76.61992673215303,
            maxLat: 16.400809170779567
        };
        let removed = layer.removeFeature(layer.search({rect: rect}));

        expect(removed).to.have.lengthOf(2);

        let result = layer.search({rect: rect});

        expect(result).to.have.lengthOf(0);
    });

    it('remove empty feature array', async () => {
        let removed = layer.removeFeature([]);

        expect(removed).to.have.lengthOf(0);
    });
});
